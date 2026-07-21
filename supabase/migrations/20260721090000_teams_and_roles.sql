-- Migration #3: teams (categories), roles, and per-team scoping
-- ---------------------------------------------------------------------------
-- Adds a two-role model (admin / team_lead) and a "team" (a.k.a. category)
-- that requests and subscriptions belong to.
--   * A team can be set to auto_approve — new requests to it skip the manual
--     review step and land straight in "pending purchase".
--   * A team_lead is a profile pinned to one team; they only ever see/act on
--     that team's requests, subscriptions, review items and spend.
--   * Admins see everything and manage teams + team leads.
--
-- Role also lives in auth.users.app_metadata (JWT) so the edge middleware can
-- authorize without a DB round-trip; `profiles` is the queryable mirror used
-- by the admin UI and by every server-side join. ADMIN_EMAILS remains the
-- bootstrap super-admin (no profile row required).
--
-- Consistent with the existing design: all access is server-side via the
-- service role, so new tables get RLS enabled with no policies (deny-all),
-- and every view/function is security_invoker with an empty search_path.

-- ── Enum ───────────────────────────────────────────────────────────────────

create type public.user_role as enum ('admin', 'team_lead');

-- ── Teams (categories) ─────────────────────────────────────────────────────

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  auto_approve boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Profiles: one row per auth user, carrying role + team assignment ────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'team_lead',
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_profiles_team on public.profiles (team_id);
create index idx_profiles_role on public.profiles (role);

-- ── team_id on the two owning tables ───────────────────────────────────────
-- ON DELETE SET NULL: deleting a team never deletes its subscriptions/requests
-- — they fall back to "unassigned" (admin-visible) so nothing is lost.

alter table public.subscriptions
  add column team_id uuid references public.teams(id) on delete set null;
create index idx_subscriptions_team on public.subscriptions (team_id);

alter table public.subscription_requests
  add column team_id uuid references public.teams(id) on delete set null;
create index idx_requests_team on public.subscription_requests (team_id);

-- ── RLS: deny-all (service role only), same as every other table ───────────

alter table public.teams enable row level security;
alter table public.profiles enable row level security;

-- ── Views: append team_id / team_name (create-or-replace appends at end) ────

create or replace view public.subscription_overview
  with (security_invoker = true) as
select
  s.id,
  s.platform,
  s.product,
  s.order_number,
  s.amount,
  s.currency,
  s.billing_cycle,
  s.next_renewal_date,
  s.account_email,
  s.status,
  s.notes,
  s.created_at,
  s.card_id,
  c.nickname       as card_nickname,
  c.name_on_card   as card_name,
  c.last4          as card_last4,
  c.status         as card_status,
  lc.status        as last_check_status,
  lc.expected_date as last_check_date,
  lc.failure_reason as last_check_failure_reason,
  s.tag,
  s.team_id,
  t.name           as team_name
from public.subscriptions s
left join public.cards c on c.id = s.card_id
left join public.teams t on t.id = s.team_id
left join lateral (
  select rc.status, rc.expected_date, rc.failure_reason
  from public.renewal_checks rc
  where rc.subscription_id = s.id
  order by rc.expected_date desc
  limit 1
) lc on true;

create or replace view public.review_queue
  with (security_invoker = true) as
select
  rc.id            as check_id,
  rc.expected_date,
  rc.expected_amount,
  rc.status,
  rc.created_at,
  s.id             as subscription_id,
  s.platform,
  s.product,
  s.currency,
  c.last4          as card_last4,
  c.mercury_card_id,
  s.team_id
from public.renewal_checks rc
join public.subscriptions s on s.id = rc.subscription_id
left join public.cards c on c.id = s.card_id
where rc.status = 'needs_review'
order by rc.expected_date asc;

-- ── Scoped RPCs ─────────────────────────────────────────────────────────────
-- Each existing aggregate gains an optional p_team_id: NULL = all teams
-- (admin), a uuid = that team only (team lead). We DROP then CREATE because
-- adding a defaulted parameter changes the signature — leaving the old
-- zero-arg overload in place would make a no-arg rpc() call ambiguous.

drop function if exists public.dashboard_totals();
create function public.dashboard_totals(p_team_id uuid default null)
returns table (
  active_subscriptions bigint,
  monthly_spend numeric,
  yearly_spend numeric,
  needs_review_count bigint,
  failed_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*) from public.subscriptions
       where status = 'active'
         and (p_team_id is null or team_id = p_team_id)),
    (select coalesce(sum(case when billing_cycle = 'monthly' then amount else amount / 12 end), 0)
       from public.subscriptions
       where status = 'active'
         and (p_team_id is null or team_id = p_team_id)),
    (select coalesce(sum(case when billing_cycle = 'yearly' then amount else amount * 12 end), 0)
       from public.subscriptions
       where status = 'active'
         and (p_team_id is null or team_id = p_team_id)),
    (select count(*) from public.renewal_checks rc
       join public.subscriptions s on s.id = rc.subscription_id
       where rc.status = 'needs_review'
         and (p_team_id is null or s.team_id = p_team_id)),
    (select count(*) from public.renewal_checks rc
       join public.subscriptions s on s.id = rc.subscription_id
       where rc.status = 'failed'
         and rc.expected_date > (current_date - interval '90 days')
         and (p_team_id is null or s.team_id = p_team_id))
$$;

drop function if exists public.upcoming_renewals(int);
create function public.upcoming_renewals(days_ahead int default 30, p_team_id uuid default null)
returns table (
  subscription_id uuid,
  platform text,
  product text,
  amount numeric,
  currency text,
  next_renewal_date date,
  card_last4 text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id, s.platform, s.product, s.amount, s.currency, s.next_renewal_date, c.last4
  from public.subscriptions s
  left join public.cards c on c.id = s.card_id
  where s.status = 'active'
    and s.next_renewal_date <= current_date + days_ahead
    and (p_team_id is null or s.team_id = p_team_id)
  order by s.next_renewal_date asc
$$;

drop function if exists public.spend_by_platform();
create function public.spend_by_platform(p_team_id uuid default null)
returns table (platform text, monthly_amount numeric, subscription_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.platform,
    sum(case when s.billing_cycle = 'monthly' then s.amount else s.amount / 12 end),
    count(*)
  from public.subscriptions s
  where s.status = 'active'
    and (p_team_id is null or s.team_id = p_team_id)
  group by s.platform
  order by 2 desc
$$;

drop function if exists public.request_counts();
create function public.request_counts(p_team_id uuid default null)
returns table (status public.request_status, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.status, count(*)
  from public.subscription_requests r
  where (p_team_id is null or r.team_id = p_team_id)
  group by r.status
$$;

drop function if exists public.subscription_tags();
create function public.subscription_tags(p_team_id uuid default null)
returns table (tag text)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct s.tag
  from public.subscriptions s
  where s.tag is not null and s.tag <> ''
    and (p_team_id is null or s.team_id = p_team_id)
  order by 1
$$;

-- ── Admin analytics RPCs ────────────────────────────────────────────────────

-- One row per team (plus an "Unassigned" bucket) with lead + subscription
-- counts, monthly spend, and open-request count. Powers the admin Teams page.
create function public.team_overview()
returns table (
  team_id uuid,
  name text,
  auto_approve boolean,
  lead_count bigint,
  subscription_count bigint,
  monthly_spend numeric,
  open_request_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.id,
    t.name,
    t.auto_approve,
    (select count(*) from public.profiles p
       where p.team_id = t.id and p.role = 'team_lead'),
    (select count(*) from public.subscriptions s
       where s.team_id = t.id and s.status = 'active'),
    (select coalesce(sum(case when s.billing_cycle = 'monthly' then s.amount else s.amount / 12 end), 0)
       from public.subscriptions s
       where s.team_id = t.id and s.status = 'active'),
    (select count(*) from public.subscription_requests r
       where r.team_id = t.id and r.status = 'requested')
  from public.teams t
  order by t.name asc
$$;

-- Monthly spend per team (normalized), including an "Unassigned" row for
-- subscriptions with no team. Admin analytics.
create function public.spend_by_team()
returns table (
  team_id uuid,
  team_name text,
  monthly_amount numeric,
  subscription_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.team_id,
    coalesce(t.name, 'Unassigned'),
    sum(case when s.billing_cycle = 'monthly' then s.amount else s.amount / 12 end),
    count(*)
  from public.subscriptions s
  left join public.teams t on t.id = s.team_id
  where s.status = 'active'
  group by s.team_id, t.name
  order by 3 desc
$$;

-- Total money-out per Mercury card across ALL synced transactions (not just
-- subscription renewals). Admin analytics — "spend across all cards".
create function public.spend_by_card()
returns table (
  mercury_card_id text,
  card_last4 text,
  card_nickname text,
  card_name text,
  total_out numeric,
  transaction_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    tx.mercury_card_id,
    c.last4,
    c.nickname,
    c.name_on_card,
    sum(-tx.amount),
    count(*)
  from public.transactions tx
  left join public.cards c on c.mercury_card_id = tx.mercury_card_id
  where tx.amount < 0
    and tx.mercury_card_id is not null
    and tx.status not in ('failed', 'cancelled', 'reversed', 'blocked')
  group by tx.mercury_card_id, c.last4, c.nickname, c.name_on_card
  order by 5 desc
$$;
