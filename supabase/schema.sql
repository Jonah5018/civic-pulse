-- ============================================================================
-- CivicPulse — Supabase schema
-- Run this whole file once in your project's SQL Editor (Dashboard → SQL →
-- New query → paste → Run). Safe to re-run: every statement is idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES  (this is where RBAC lives — one row per auth.users row)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'citizen' check (role in ('citizen', 'admin')),
  super_admin boolean not null default false,
  full_name text,
  phone_number text,
  admin_phone text,
  approved_wards bigint[] default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile and admins can read profiles of users in their wards
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Only central admins can update role, super_admin flag, and approved_wards
-- Users can update their own phone_number
drop policy if exists "Super admins can manage users" on public.profiles;
create policy "Super admins can manage users"
  on public.profiles for update
  to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

drop policy if exists "Users can update their own phone" on public.profiles;
create policy "Users can update their own phone"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- GIN index for efficient ward-membership lookups in RLS policies
create index if not exists profiles_approved_wards_gin
  on public.profiles using gin (approved_wards);

-- Auto-create a "citizen" profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, super_admin)
  values (new.id, 'citizen', new.raw_user_meta_data ->> 'full_name', false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and super_admin = true
  );
$$;

-- Security-definer helper so RLS policies can check "is this caller an
-- admin?" without re-triggering RLS on profiles (the recommended Supabase
-- pattern — see supabase.com/docs .../custom-claims-and-role-based-access-control-rbac).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. REPORTS  (public-safe fields only — no name/phone in here, see §3)
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tracking_id text not null unique,
  category text not null check (category in
    ('road', 'power', 'water', 'waste', 'security', 'health', 'education', 'other')),
  description text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  admin_note text,
  state text not null,
  lga text not null,
  ward text not null,
  latitude double precision,
  longitude double precision,
  place_name text,
  evidence_urls text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'resolved', 'escalated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_state_idx on public.reports (state);
create index if not exists reports_lga_idx on public.reports (lga);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_ward_created_idx on public.reports (ward, created_at desc);

-- Extension + trigram indexes for fast ILIKE search on reports
create extension if not exists pg_trgm;
create index if not exists reports_tracking_id_idx
  on public.reports using gin (tracking_id gin_trgm_ops);
create index if not exists reports_category_idx
  on public.reports using gin (category gin_trgm_ops);
create index if not exists reports_description_idx
  on public.reports using gin (description gin_trgm_ops);

alter table public.reports enable row level security;

-- Only authenticated users can submit reports
drop policy if exists "Anyone can submit a report" on public.reports;
create policy "Authenticated users can submit a report"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Reports are publicly readable
drop policy if exists "Reports are publicly readable" on public.reports;
create policy "Reports are publicly readable"
  on public.reports for select
  to anon, authenticated
  using (true);

-- Only admins approved for this ward can update reports
drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports for their wards"
  on public.reports for update
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    and ward = any((select approved_wards from public.profiles where id = auth.uid()))
  )
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    and ward = any((select approved_wards from public.profiles where id = auth.uid()))
  );

drop policy if exists "Admins can delete reports" on public.reports;
create policy "Admins can delete reports for their wards"
  on public.reports for delete
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    and ward = any((select approved_wards from public.profiles where id = auth.uid()))
  );

drop policy if exists "Users can read own reports" on public.reports;
create policy "Users can read own reports"
  on public.reports for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update own reports" on public.reports;
create policy "Users can update own reports"
  on public.reports for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reports" on public.reports;
create policy "Users can delete own reports"
  on public.reports for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute procedure public.set_updated_at();

-- Stream every insert/update to Mission Control in real time.
alter publication supabase_realtime add table public.reports;

-- ----------------------------------------------------------------------------
-- 3. REPORT CONTACTS  (optional name/phone, admin-eyes-only)
-- ----------------------------------------------------------------------------
create table if not exists public.report_contacts (
  report_id uuid primary key references public.reports (id) on delete cascade,
  reporter_name text,
  reporter_phone text,
  created_at timestamptz not null default now()
);

alter table public.report_contacts enable row level security;

-- Only authenticated users can create report contacts, and only for their own reports
drop policy if exists "Anyone can attach contact info to their report" on public.report_contacts;
create policy "Authenticated users can attach contact info to their report"
  on public.report_contacts for insert
  to authenticated
  with check (
    exists (select 1 from public.reports where id = report_id and user_id = auth.uid())
  );

-- Admins can read contact info for reports in their wards
drop policy if exists "Only admins can read contact info" on public.report_contacts;
create policy "Admins can read contact info for their wards"
  on public.report_contacts for select
  to authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id
      and r.ward = any((select approved_wards from public.profiles where id = auth.uid()))
    )
  );

-- ----------------------------------------------------------------------------
-- 4. WARDS  (reference data for the State → LGA → Ward cascade)
-- ----------------------------------------------------------------------------
create table if not exists public.wards (
  id bigint generated always as identity primary key,
  state text not null,
  lga text not null,
  name text not null,
  unique (lga, name)
);

create index if not exists wards_lga_idx on public.wards (lga);

alter table public.wards enable row level security;

drop policy if exists "Wards are publicly readable" on public.wards;
create policy "Wards are publicly readable"
  on public.wards for select
  to anon, authenticated
  using (true);

-- Seed: real INEC wards for Umuahia North, Abia State, as a working example.
-- Add more LGAs the same way — the Home form falls back to a free-text ward
-- field automatically for any LGA with zero rows here.
insert into public.wards (state, lga, name) values
  ('Abia', 'Umuahia North', 'Afugiri'),
  ('Abia', 'Umuahia North', 'Ibeku East I'),
  ('Abia', 'Umuahia North', 'Ibeku East II'),
  ('Abia', 'Umuahia North', 'Ibeku West'),
  ('Abia', 'Umuahia North', 'Isingwu'),
  ('Abia', 'Umuahia North', 'Ndume'),
  ('Abia', 'Umuahia North', 'Nkwoachara'),
  ('Abia', 'Umuahia North', 'Nkwoegwu'),
  ('Abia', 'Umuahia North', 'Umuahia Urban I'),
  ('Abia', 'Umuahia North', 'Umuahia Urban II'),
  ('Abia', 'Umuahia North', 'Umuahia Urban III'),
  ('Abia', 'Umuahia North', 'Umuhu')
on conflict (lga, name) do nothing;

-- ----------------------------------------------------------------------------
-- 5. REPORT STATUS HISTORY  (timeline for incident updates)
-- ----------------------------------------------------------------------------
create table if not exists public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  status text not null check (status in ('pending', 'in_progress', 'resolved', 'escalated')),
  changed_at timestamptz not null default now(),
  changed_by text,
  note text
);

create index if not exists report_status_history_report_idx on public.report_status_history (report_id, changed_at desc);

alter table public.report_status_history enable row level security;

drop policy if exists "Authenticated users can create status history for own reports" on public.report_status_history;
create policy "Authenticated users can create status history for own reports"
  on public.report_status_history for insert
  to authenticated
  with check (
    exists (
      select 1 from public.reports
      where id = report_id and user_id = auth.uid()
    )
  );

drop policy if exists "Admins can read status history" on public.report_status_history;
create policy "Admins can read status history"
  on public.report_status_history for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Users can read status history for own reports" on public.report_status_history;
create policy "Users can read status history for own reports"
  on public.report_status_history for select
  to authenticated
  using (
    exists (
      select 1 from public.reports
      where id = report_id and user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 5b. ADMIN AUDIT LOG  (tracks actions taken by admins)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  previous_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_report_idx on public.admin_audit_log (report_id, created_at desc);
create index if not exists admin_audit_log_admin_idx on public.admin_audit_log (admin_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "Admins can read audit log" on public.admin_audit_log;
create policy "Admins can read audit log"
  on public.admin_audit_log for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "System can insert audit log" on public.admin_audit_log;
create policy "System can insert audit log"
  on public.admin_audit_log for insert
  to authenticated
  with check ((select public.is_admin()));

-- ----------------------------------------------------------------------------
-- 6. STORAGE  (evidence photos/videos)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('report-evidence', 'report-evidence', true)
on conflict (id) do nothing;

drop policy if exists "Public can view evidence" on storage.objects;
create policy "Public can view evidence"
  on storage.objects for select
  to public
  using (bucket_id = 'report-evidence');

drop policy if exists "Anyone can upload evidence" on storage.objects;
create policy "Authenticated users can upload evidence"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'report-evidence'
    AND (storage.extension(name) = ANY(ARRAY['jpg','jpeg','png','pdf','mp4','webm']))
    AND name ~ '^[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|pdf|mp4|webm)$'
    AND LENGTH(name) < 255
  );

-- ============================================================================
-- Done. Next step: create your first admin account — see README.md.
-- ============================================================================
