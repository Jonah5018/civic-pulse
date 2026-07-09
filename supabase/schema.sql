-- ============================================================================
-- CivicPulse — Type-Safe Reordered Supabase Schema (Idempotent)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PHASE 1: EXTENSIONS & TABLES
-- ----------------------------------------------------------------------------
create extension if not exists pg_trgm;

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

create table if not exists public.report_contacts (
  report_id uuid primary key references public.reports (id) on delete cascade,
  reporter_name text,
  reporter_phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.wards (
  id bigint generated always as identity primary key,
  state text not null,
  lga text not null,
  name text not null,
  unique (lga, name)
);

create table if not exists public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  status text not null check (status in ('pending', 'in_progress', 'resolved', 'escalated')),
  changed_at timestamptz not null default now(),
  changed_by text,
  note text
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  previous_value text,
  new_value text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PHASE 2: FUNCTIONS & TRIGGERS (Bypasses RLS to avoid circular recursion)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- PHASE 3: ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- PROFILES
alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select to authenticated using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles for select to authenticated using (public.is_admin());

drop policy if exists "Super admins can manage users" on public.profiles;
create policy "Super admins can manage users" on public.profiles for update to authenticated using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

drop policy if exists "Users can update their own phone" on public.profiles;
create policy "Users can update their own phone" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- REPORTS
alter table public.reports enable row level security;

drop policy if exists "Authenticated users can submit a report" on public.reports;
create policy "Authenticated users can submit a report" on public.reports for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Reports are publicly readable" on public.reports;
create policy "Reports are publicly readable" on public.reports for select to anon, authenticated using (true);

drop policy if exists "Admins can update reports for their wards" on public.reports;
create policy "Admins can update reports for their wards" on public.reports for update to authenticated 
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
      and public.reports.ward in (
        select w.name from public.wards w where w.id = any(p.approved_wards)
      )
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
      and public.reports.ward in (
        select w.name from public.wards w where w.id = any(p.approved_wards)
      )
    )
  );

drop policy if exists "Admins can delete reports for their wards" on public.reports;
create policy "Admins can delete reports for their wards" on public.reports for delete to authenticated 
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
      and public.reports.ward in (
        select w.name from public.wards w where w.id = any(p.approved_wards)
      )
    )
  );

drop policy if exists "Users can read own reports" on public.reports;
create policy "Users can read own reports" on public.reports for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can update own reports" on public.reports;
create policy "Users can update own reports" on public.reports for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reports" on public.reports;
create policy "Users can delete own reports" on public.reports for delete to authenticated using (auth.uid() = user_id);

-- REPORT CONTACTS
alter table public.report_contacts enable row level security;

drop policy if exists "Authenticated users can attach contact info to their report" on public.report_contacts;
create policy "Authenticated users can attach contact info to their report" on public.report_contacts for insert to authenticated with check (exists (select 1 from public.reports where id = report_id and user_id = auth.uid()));

drop policy if exists "Admins can read contact info for their wards" on public.report_contacts;
create policy "Admins can read contact info for their wards" on public.report_contacts for select to authenticated 
  using (
    exists (
      select 1 from public.reports r
      join public.profiles p on p.id = auth.uid()
      where r.id = report_id and p.role = 'admin'
      and r.ward in (
        select w.name from public.wards w where w.id = any(p.approved_wards)
      )
    )
  );

-- WARDS
alter table public.wards enable row level security;

drop policy if exists "Wards are publicly readable" on public.wards;
create policy "Wards are publicly readable" on public.wards for select to anon, authenticated using (true);

-- REPORT STATUS HISTORY
alter table public.report_status_history enable row level security;

drop policy if exists "Authenticated users can create status history for own reports" on public.report_status_history;
create policy "Authenticated users can create status history for own reports" on public.report_status_history for insert to authenticated with check (exists (select 1 from public.reports where id = report_id and user_id = auth.uid()));

drop policy if exists "Admins can read status history" on public.report_status_history;
create policy "Admins can read status history" on public.report_status_history for select to authenticated using (public.is_admin());

drop policy if exists "Users can read status history for own reports" on public.report_status_history;
create policy "Users can read status history for own reports" on public.report_status_history for select to authenticated using (exists (select 1 from public.reports where id = report_id and user_id = auth.uid()));

-- ADMIN AUDIT LOG
alter table public.admin_audit_log enable row level security;

drop policy if exists "Admins can read audit log" on public.admin_audit_log;
create policy "Admins can read audit log" on public.admin_audit_log for select to authenticated using (public.is_admin());

drop policy if exists "System can insert audit log" on public.admin_audit_log;
create policy "System can insert audit log" on public.admin_audit_log for insert to authenticated with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- PHASE 4: INDEXES, REALTIME, SEED DATA & STORAGE
-- ----------------------------------------------------------------------------

-- Indexes
create index if not exists profiles_approved_wards_gin on public.profiles using gin (approved_wards);
create index if not exists reports_state_idx on public.reports (state);
create index if not exists reports_lga_idx on public.reports (lga);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_ward_created_idx on public.reports (ward, created_at desc);
create index if not exists reports_tracking_id_idx on public.reports using gin (tracking_id gin_trgm_ops);
create index if not exists reports_category_idx on public.reports using gin (category gin_trgm_ops);
create index if not exists reports_description_idx on public.reports using gin (description gin_trgm_ops);
create index if not exists wards_lga_idx on public.wards (lga);
create index if not exists report_status_history_report_idx on public.report_status_history (report_id, changed_at desc);
create index if not exists admin_audit_log_report_idx on public.admin_audit_log (report_id, created_at desc);
create index if not exists admin_audit_log_admin_idx on public.admin_audit_log (admin_id);

-- Realtime
alter publication supabase_realtime add table public.reports;

-- Seed Data (Umuahia North Wards)
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

-- Storage Setup
insert into storage.buckets (id, name, public)
values ('report-evidence', 'report-evidence', true)
on conflict (id) do nothing;

drop policy if exists "Public can view evidence" on storage.objects;
create policy "Public can view evidence" on storage.objects for select to public using (bucket_id = 'report-evidence');

drop policy if exists "Authenticated users can upload evidence" on storage.objects;
create policy "Authenticated users can upload evidence" on storage.objects for insert to authenticated with check (
    bucket_id = 'report-evidence'
    AND (storage.extension(name) = ANY(ARRAY['jpg','jpeg','png','pdf','mp4','webm']))
    AND name ~ '^[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|pdf|mp4|webm)$'
    AND LENGTH(name) < 255
);