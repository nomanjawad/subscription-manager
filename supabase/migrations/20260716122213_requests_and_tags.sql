-- Migration #2: subscription request workflow + tags
-- Request lifecycle: requested → approved (pending purchase) → purchased
--                                → rejected
-- Purchased requests link to the real subscription they became.

-- ── Tags on subscriptions ────────────────────────────────────────────────

alter table public.subscriptions add column tag text;
create index idx_subscriptions_tag on public.subscriptions (tag);

-- ── Requests ─────────────────────────────────────────────────────────────

create type public.request_status as enum ('requested', 'approved', 'rejected', 'purchased');

create table public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  requester_email text not null,
  platform text not null,
  product text,
  reason text,
  amount_estimate numeric(12,2) check (amount_estimate is null or amount_estimate > 0),
  billing_cycle public.billing_cycle not null default 'monthly',
  tag text,
  status public.request_status not null default 'requested',
  review_note text,
  reviewed_at timestamptz,
  purchased_subscription_id uuid references public.subscriptions(id),
  created_at timestamptz not null default now()
);

create index idx_requests_status on public.subscription_requests (status, created_at desc);

alter table public.subscription_requests enable row level security;
-- deny-all: the public request form submits through a server action
-- (service role); the anon Data API can neither read nor write requests.

-- ── subscription_overview: append tag (create-or-replace appends at end) ─

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
  s.tag
from public.subscriptions s
left join public.cards c on c.id = s.card_id
left join lateral (
  select rc.status, rc.expected_date, rc.failure_reason
  from public.renewal_checks rc
  where rc.subscription_id = s.id
  order by rc.expected_date desc
  limit 1
) lc on true;

-- ── RPC: distinct tags for the filter dropdown ──────────────────────────

create function public.subscription_tags()
returns table (tag text)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct s.tag
  from public.subscriptions s
  where s.tag is not null and s.tag <> ''
  order by 1
$$;

-- ── RPC: request counts per status (admin panel badges) ─────────────────

create function public.request_counts()
returns table (status public.request_status, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.status, count(*)
  from public.subscription_requests r
  group by r.status
$$;
