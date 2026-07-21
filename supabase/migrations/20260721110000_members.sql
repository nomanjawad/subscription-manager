-- Migration #5: members (non-login users assigned to a team lead)
-- ---------------------------------------------------------------------------
-- A "member" is a person who can only REQUEST a subscription — they never sign
-- in to the app. The admin maintains this directory and assigns each member to
-- a team lead; that lead (i.e. the lead's team) is who ends up approving the
-- member's requests.
--
-- Members are deliberately NOT auth.users rows: they have no login, no role,
-- and no JWT. They live in their own table and reference the team lead's
-- profile. Deleting the lead detaches the member (lead_id -> NULL) rather than
-- deleting them, so the directory is never silently lost.
--
-- Consistent with the rest of the schema: all access is server-side via the
-- service role, so the table gets RLS enabled with no policies (deny-all), and
-- the directory function is security_invoker with an empty search_path.

-- ── Members ──────────────────────────────────────────────────────────────

create table public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text not null,
  lead_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One directory entry per email (case-insensitive).
create unique index idx_members_email on public.members (lower(email));
create index idx_members_lead on public.members (lead_id);

-- ── RLS: deny-all (service role only), same as every other table ──────────

alter table public.members enable row level security;

-- ── Directory RPC ──────────────────────────────────────────────────────────
-- One row per member with the assigned lead (name/email) and that lead's team
-- resolved for display. Powers the admin Users page.

create function public.member_directory()
returns table (
  id uuid,
  full_name text,
  email text,
  lead_id uuid,
  lead_name text,
  lead_email text,
  team_id uuid,
  team_name text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    m.id,
    m.full_name,
    m.email,
    m.lead_id,
    p.full_name as lead_name,
    p.email     as lead_email,
    p.team_id,
    t.name      as team_name,
    m.created_at
  from public.members m
  left join public.profiles p on p.id = m.lead_id
  left join public.teams t on t.id = p.team_id
  order by m.created_at desc
$$;
