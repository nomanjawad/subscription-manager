-- Migration #14: subscription start date + period-scoped actual spend
-- ---------------------------------------------------------------------------
-- 1) subscriptions.start_date — when the subscription began. The subscription
--    list filters on it (date range) and the export carries it. Existing rows
--    are backfilled from created_at; new rows default to today so the other
--    insert paths (purchase flow, statement capture) need no change.
-- 2) subscription_overview gains start_date (appended — create or replace
--    can only add columns at the end).
-- 3) spend_by_team_period / spend_by_card_period — ACTUAL money out (synced
--    Mercury transactions) for the current calendar week / month / year to
--    date. Same attribution and exclusions as spend_by_team_actual /
--    spend_by_card; weeks start on Monday (Postgres date_trunc).

alter table public.subscriptions
  add column start_date date;

update public.subscriptions
  set start_date = created_at::date
  where start_date is null;

alter table public.subscriptions
  alter column start_date set default current_date,
  alter column start_date set not null;

create index idx_subscriptions_start_date on public.subscriptions (start_date);

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
  t.name           as team_name,
  s.purchased_by,
  pb.full_name     as purchased_by_name,
  exists (
    select 1 from public.cancellation_requests cr
    where cr.subscription_id = s.id and cr.status = 'pending'
  ) as cancellation_pending,
  s.start_date
from public.subscriptions s
left join public.cards c on c.id = s.card_id
left join public.teams t on t.id = s.team_id
left join public.profiles pb on pb.id = s.purchased_by
left join lateral (
  select rc.status, rc.expected_date, rc.failure_reason
  from public.renewal_checks rc
  where rc.subscription_id = s.id
  order by rc.expected_date desc
  limit 1
) lc on true;

-- Actual money out per team since the start of the current period.
create function public.spend_by_team_period(p_period text default 'month')
returns table (
  team_id uuid,
  team_name text,
  total_out numeric,
  transaction_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.team_id,
    coalesce(t.name, 'Unassigned'),
    sum(-tx.amount),
    count(*)
  from public.transactions tx
  left join public.cards c on c.mercury_card_id = tx.mercury_card_id
  left join public.teams t on t.id = c.team_id
  where tx.amount < 0
    and tx.mercury_card_id is not null
    and tx.status not in ('failed', 'cancelled', 'reversed', 'blocked')
    and p_period in ('week', 'month', 'year')
    and coalesce(tx.posted_at, tx.created_at_mercury)
        >= date_trunc(p_period, current_date)
  group by c.team_id, t.name
  order by 3 desc
$$;

-- Actual money out per card since the start of the current period, optionally
-- limited to the cards assigned to one team (team-lead dashboard).
create function public.spend_by_card_period(
  p_period text default 'month',
  p_team_id uuid default null
)
returns table (
  mercury_card_id text,
  card_last4 text,
  card_nickname text,
  card_name text,
  team_name text,
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
    t.name,
    sum(-tx.amount),
    count(*)
  from public.transactions tx
  left join public.cards c on c.mercury_card_id = tx.mercury_card_id
  left join public.teams t on t.id = c.team_id
  where tx.amount < 0
    and tx.mercury_card_id is not null
    and tx.status not in ('failed', 'cancelled', 'reversed', 'blocked')
    and p_period in ('week', 'month', 'year')
    and coalesce(tx.posted_at, tx.created_at_mercury)
        >= date_trunc(p_period, current_date)
    and (p_team_id is null or c.team_id = p_team_id)
  group by tx.mercury_card_id, c.last4, c.nickname, c.name_on_card, t.name
  order by 6 desc
$$;
