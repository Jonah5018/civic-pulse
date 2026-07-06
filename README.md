# CivicPulse

A futuristic, glassmorphic citizen-reporting platform for South-East Nigeria —
built for the **3MTT NextGen Talent Showcase**.

Citizens report broken infrastructure (roads, power, water, waste, security,
health, education) with GPS + photo/video evidence and get a tracking ID to
follow progress. A protected **Mission Control** dashboard gives the response
team a live, real-time view of every incident, with role-based access control
enforced by Supabase.

---

## Feature highlights

**Citizen portal (`/`)**
- Futuristic glassmorphic report form — floating labels, glowing focus rings
- Category picker (8 types) + 4-level priority selector
- Cascading **State → LGA → Ward** dropdowns for all 5 South-East states
  (Abia, Anambra, Ebonyi, Enugu, Imo) — real, verified LGA lists
- "Use my GPS location" button with a radar-sweep animation + free
  reverse-geocoding (OpenStreetMap Nominatim)
- Drag-and-drop evidence upload (photos/video) with live thumbnail previews,
  stored in Supabase Storage
- Anonymous reporting — no account required — with an optional name/phone
  kept in a separate, admin-only table (see RBAC & security below)
- Instant tracking ID (e.g. `CP-4F82A1`) + a "Track my report" panel so
  citizens can check status any time, no login needed
- Live stats strip (total reports / resolved / states covered)
- Full English to Igbo UI toggle (persisted across visits)

**Admin sign-in (`/login`)**
- Biometric-inspired glass card with a pulsing fingerprint icon
- Email/password auth via Supabase Auth, inline error states, loading spinner

**Mission Control dashboard (`/dashboard`, admin-only)**
- 4 glowing metric cards: Total, Pending, Resolved, Critical-open
- Live updates — new reports stream in instantly via Supabase Realtime, with
  a toast notification
- Two charts: reports by state, and a 14-day trend line
- Searchable, filterable (by state + status) incident table
- Inline status changes (Pending, In Progress, Resolved, Escalated) with
  glowing status pills
- Evidence viewer modal
- One-click CSV export of the current filtered view

**Route protection**
- The dashboard route re-checks the live Supabase session + role on every
  navigation. Non-admins are blocked instantly, redirected to `/`, and shown
  a red "Unauthorized Access" toast — this isn't just a one-time login gate.

**Design**
- Dark, deep-navy glassmorphism with emerald + cyan glow accents
- Type system: Space Grotesk (display), Plus Jakarta Sans (body), JetBrains
  Mono (tracking IDs / data) — deliberately not the default system/Inter look
- Signature motif: a "civic radar" sweep that ties together the GPS button,
  the ambient hero background, and the live dashboard badge
- Skeleton loaders everywhere data is fetched, reduced-motion support,
  keyboard-visible focus rings throughout

---

## Tech stack

| Layer      | Choice                                                            |
|------------|--------------------------------------------------------------------|
| Framework  | React 19 + Vite 8                                                   |
| Routing    | React Router 8 (`react-router`)                                     |
| Styling    | Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`)        |
| Animation  | Motion (formerly Framer Motion) — `motion/react`                    |
| Icons      | lucide-react                                                        |
| Charts     | Recharts                                                            |
| Toasts     | Sonner (custom-themed to match the glass UI)                        |
| Backend    | Supabase (Postgres, Auth, Storage, Realtime, Row Level Security)    |

---

## Getting started

### 1. Install dependencies

```bash
cd civic-pulse
npm install
```

### 2. Create a Supabase project

Go to supabase.com -> New Project. Once it's ready, open **Project Settings
-> API** and copy:
- **Project URL**
- **anon public** key

### 3. Configure environment variables

```bash
cp .env.example .env
```

Paste your values into `.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

### 4. Run the database schema

Open your Supabase project -> **SQL Editor -> New query**, paste the entire
contents of `supabase/schema.sql`, and click **Run**.

This one file sets up everything: the `profiles` (roles), `reports`,
`report_contacts`, and `wards` tables, every Row Level Security policy, the
`report-evidence` storage bucket, realtime streaming, and a seed set of real
wards for Umuahia North so the cascading dropdown has genuine data to show.

### 5. Create your first admin account

The app's `/login` page is intentionally sign-in only (no public sign-up) —
response-team accounts are provisioned by you, the project owner.

1. Supabase Dashboard -> **Authentication -> Users -> Add user** (set an
   email + password, or send an invite).
2. Copy that user's UUID.
3. Back in the **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'admin' where id = 'PASTE-USER-UUID-HERE';
   ```
4. Sign in at `/login` with that email/password — you'll land on
   `/dashboard`. Any other account defaults to the `citizen` role and gets
   redirected away from the dashboard with the unauthorized toast.

### 6. Run it locally

```bash
npm run dev
```

Open the printed localhost URL.

### 7. Build for production

```bash
npm run build
```

Output goes to `dist/`. Preview it locally with `npm run preview`.

---

## Deploying

Any static host works (Vercel, Netlify, Cloudflare Pages). Quick version for
Vercel:

1. Push this folder to a GitHub repo.
2. vercel.com/new -> import the repo.
3. Framework preset: Vite. Build command `npm run build`, output dir `dist`.
4. Add the two environment variables from your `.env` in the Vercel project
   settings, then deploy.

Netlify is the same idea: build command `npm run build`, publish directory
`dist`.

---

## RBAC & security

- **Roles live in `public.profiles.role`**, a table with Row Level Security
  enabled. There is deliberately no client-side policy that lets a user
  change their own role — the only way to become an admin is you running
  the `update` statement above from the SQL Editor. This closes the obvious
  "sign up, then promote myself" hole.
- `ProtectedRoute` (`src/components/ProtectedRoute.jsx`) reads the live
  session + role from `AuthContext` on every render — including when
  navigating directly to `/dashboard` — and redirects non-admins immediately.
- **Reporter contact info (name/phone) is stored in a separate table**
  (`report_contacts`) that only admins can read. The `reports` table itself
  (category, location, status, evidence) is intentionally public-readable —
  the same accountability-through-transparency model used by civic trackers
  like FixMyStreet — so the "track my report" page can work without a login,
  without exposing anyone's phone number.
- For a larger deployment, look at Supabase's Custom Claims & RBAC guide
  (supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
  to move the role check into the JWT itself via an Auth Hook — the
  profiles-table approach here is simpler and is the right amount of
  security for this project's scale, but that's the documented next step.

---

## On the location data

- **State and LGA lists are real and verified** against state government /
  INEC sources for all 5 states.
- **Ward-level data is only seeded for one LGA** (Umuahia North — 12 real
  INEC wards) as a working example, because Nigeria has hundreds of wards
  and hand-typing all of them risked errors. The Home form tries to load
  wards for the selected LGA from the `wards` table first; if none exist yet,
  it automatically falls back to a free-text "ward / closest landmark" field
  so reporting is never blocked.
- To add more wards, insert rows into `public.wards` (`state`, `lga`, `name`)
  — see the seed block at the bottom of `supabase/schema.sql` for the format.

## On the Igbo translations

The Igbo copy in `src/i18n/translations.js` is a solid working draft, not a
professionally reviewed localization. Since you're a native speaker, it's
worth a quick read-through before you present or launch — the structure
makes it easy to tweak individual strings without touching any component
code.

---

## Project structure

```
src/
  components/     Navbar, ProtectedRoute, FloatingField, GPSButton,
                  FileDropzone, StatusPill, MetricCard, RadarField, ...
  context/        AuthContext (Supabase session + role), LanguageContext
  data/           Verified State/LGA lists + seed ward data
  hooks/          useReports (admin data + realtime + CSV export)
  i18n/           English/Igbo dictionary
  lib/            supabaseClient, report submission/tracking helpers
  pages/          Home, Login, AdminDashboard, NotFound
supabase/
  schema.sql      Full DB schema, RLS policies, storage bucket, seed data
```

---

Built for the 3MTT NextGen Talent Showcase. Good luck!
