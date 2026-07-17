-- Subscription Manager — initial schema
-- Design contract (DEVELOPMENT_PLAN.md → Architecture principles):
--   * Modules never join tables in JS — cross-table reads go through the
--     views/functions defined at the bottom of this file.
--   * Filtering/aggregation happens here (RPC), not in the app.
--   * All app access is server-side via the service-role key; RLS is enabled
--     deny-all so nothing is reachable through the anon Data API.

-- ── Enums ────────────────────────────────────────────────────────────────

create type public.billing_cycle as enum ('monthly', 'yearly');
create type public.subscription_status as enum ('active', 'cancelled');
create type public.check_status as enum ('pending', 'renewed', 'failed', 'needs_review');

-- ── Tables ───────────────────────────────────────────────────────────────

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  mercury_card_id text unique not null,
  mercury_account_id text not null,
  name_on_card text,
  nickname text,
  last4 text not null,
  network text,
  card_type text,
  status text not null default 'active',
  synced_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  product text,
  order_number text,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD',
  billing_cycle public.billing_cycle not null default 'monthly',
  next_renewal_date date not null,
  card_id uuid references public.cards(id),
  account_email text,
  status public.subscription_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  mercury_transaction_id text unique not null,
  mercury_account_id text not null,
  amount numeric(12,2) not null,
  status text not null,
  kind text,
  counterparty_name text,
  bank_description text,
  mercury_card_id text,
  posted_at timestamptz,
  created_at_mercury timestamptz,
  failed_at timestamptz,
  reason_for_failure text,
  raw jsonb not null,
  synced_at timestamptz not null default now()
);

create table public.renewal_checks (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  expected_date date not null,
  expected_amount numeric(12,2) not null,
  status public.check_status not null default 'pending',
  matched_transaction_id uuid references public.transactions(id),
  failure_reason text,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subscription_id, expected_date)
);

create table public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  descriptor_pattern text not null,
  learned_from_transaction_id uuid references public.transactions(id),
  created_at timestamptz not null default now(),
  unique (subscription_id, descriptor_pattern)
);

-- ── Indexes for the hot query paths ──────────────────────────────────────

create index idx_transactions_card on public.transactions (mercury_card_id);
create index idx_transactions_posted on public.transactions (posted_at desc);
create index idx_transactions_status on public.transactions (status);
create index idx_subscriptions_renewal on public.subscriptions (status, next_renewal_date);
create index idx_renewal_checks_status on public.renewal_checks (status);
create index idx_renewal_checks_subscription on public.renewal_checks (subscription_id, expected_date desc);

-- ── updated_at trigger ───────────────────────────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ── RLS: deny-all for anon/authenticated; the app uses the service role ──

alter table public.cards enable row level security;
alter table public.subscriptions enable row level security;
alter table public.transactions enable row level security;
alter table public.renewal_checks enable row level security;
alter table public.merchant_aliases enable row level security;

-- ── Cross-module views (the only sanctioned multi-table reads) ──────────

-- Subscriptions joined with their card and most recent check.
-- Consumed by m02-subscriptions (list) and m05-review.
create view public.subscription_overview
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
  lc.failure_reason as last_check_failure_reason
from public.subscriptions s
left join public.cards c on c.id = s.card_id
left join lateral (
  select rc.status, rc.expected_date, rc.failure_reason
  from public.renewal_checks rc
  where rc.subscription_id = s.id
  order by rc.expected_date desc
  limit 1
) lc on true;

-- Review queue: unresolved checks with their subscription + card context.
-- Consumed by m05-review.
create view public.review_queue
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
  c.mercury_card_id
from public.renewal_checks rc
join public.subscriptions s on s.id = rc.subscription_id
left join public.cards c on c.id = s.card_id
where rc.status = 'needs_review'
order by rc.expected_date asc;

-- ── RPC functions (database-side filtering/aggregation) ─────────────────

-- Dashboard aggregates in one round trip. Consumed by m06-dashboard.
create function public.dashboard_totals()
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
    (select count(*) from public.subscriptions where status = 'active'),
    (select coalesce(sum(case when billing_cycle = 'monthly' then amount else amount / 12 end), 0)
       from public.subscriptions where status = 'active'),
    (select coalesce(sum(case when billing_cycle = 'yearly' then amount else amount * 12 end), 0)
       from public.subscriptions where status = 'active'),
    (select count(*) from public.renewal_checks where status = 'needs_review'),
    (select count(*) from public.renewal_checks
       where status = 'failed'
         and expected_date > (current_date - interval '90 days'))
$$;

-- Upcoming renewals within N days. Consumed by m06-dashboard.
create function public.upcoming_renewals(days_ahead int default 30)
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
  order by s.next_renewal_date asc
$$;

-- Per-platform spend breakdown (normalized to monthly). Consumed by m06-dashboard.
create function public.spend_by_platform()
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
  group by s.platform
  order by 2 desc
$$;

-- Near-miss candidate transactions for a review item: same card OR close
-- amount, within a wide date window. Consumed by m05-review.
create function public.candidate_transactions(p_check_id uuid)
returns table (
  transaction_id uuid,
  mercury_transaction_id text,
  amount numeric,
  tx_status text,
  counterparty_name text,
  bank_description text,
  posted_at timestamptz,
  mercury_card_id text,
  same_card boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.id,
    t.mercury_transaction_id,
    t.amount,
    t.status,
    t.counterparty_name,
    t.bank_description,
    t.posted_at,
    t.mercury_card_id,
    (t.mercury_card_id is not null and t.mercury_card_id = c.mercury_card_id)
  from public.renewal_checks rc
  join public.subscriptions s on s.id = rc.subscription_id
  left join public.cards c on c.id = s.card_id
  cross join lateral (
    select * from public.transactions t
    where t.amount < 0
      and coalesce(t.posted_at, t.created_at_mercury)
            between rc.expected_date - interval '10 days'
                and rc.expected_date + interval '10 days'
      and (
        (t.mercury_card_id is not null and t.mercury_card_id = c.mercury_card_id)
        or abs(abs(t.amount) - rc.expected_amount) <= rc.expected_amount * 0.15
      )
    order by abs(abs(t.amount) - rc.expected_amount) asc
    limit 10
  ) t
  where rc.id = p_check_id
$$;
