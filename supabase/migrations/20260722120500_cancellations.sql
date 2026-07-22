-- Migration #11: subscription cancellation requests
-- ---------------------------------------------------------------------------
-- A lightweight two-state flow (no approval step): 'pending' → 'cancelled'.
-- Two entry points create a pending row:
--   * the public /cancellation-request form (free-text platform/product+email,
--     routed to a team by email — subscription_id null until a buyer links it);
--   * a team lead / admin clicking "Request cancellation" on a subscription row
--     (subscription_id set, platform/product/team copied from the subscription).
-- Only a buyer (or admin) finalizes: status → 'cancelled', and if a subscription
-- is linked, that subscription flips to status='cancelled'. Service-role only,
-- RLS deny-all like every other table.

create type public.cancellation_status as enum ('pending', 'cancelled');

create table public.cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  requester_name text,
  requester_email text,
  platform text,
  product text,
  reason text,
  team_id uuid references public.teams(id) on delete set null,
  status public.cancellation_status not null default 'pending',
  requested_by uuid references public.profiles(id) on delete set null,
  cancelled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index idx_cancellations_status on public.cancellation_requests (status, created_at desc);
create index idx_cancellations_team on public.cancellation_requests (team_id);
create index idx_cancellations_subscription on public.cancellation_requests (subscription_id);

alter table public.cancellation_requests enable row level security;

-- Read model for the admin/lead/buyer list: resolves team + actor names + the
-- linked subscription's details in one place (no JS joins).
create view public.cancellation_overview
  with (security_invoker = true) as
select
  cr.id,
  cr.subscription_id,
  cr.requester_name,
  cr.requester_email,
  cr.platform,
  cr.product,
  cr.reason,
  cr.team_id,
  t.name           as team_name,
  cr.status,
  cr.requested_by,
  rp.full_name     as requested_by_name,
  cr.cancelled_by,
  cp.full_name     as cancelled_by_name,
  cr.created_at,
  cr.cancelled_at,
  s.status         as sub_status,
  s.amount         as sub_amount,
  s.currency       as sub_currency
from public.cancellation_requests cr
left join public.teams t on t.id = cr.team_id
left join public.profiles rp on rp.id = cr.requested_by
left join public.profiles cp on cp.id = cr.cancelled_by
left join public.subscriptions s on s.id = cr.subscription_id
order by cr.created_at desc;

-- Surface a "has an open cancellation" flag on the subscription list so the UI
-- can badge it and block a second request. (create or replace appends the new
-- column at the end.)
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
  ) as cancellation_pending
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

-- Seed the two cancellation email templates (email_templates created in #10).
insert into public.email_templates (key, name, subject, html) values
(
  'cancellation_received',
  'Cancellation received → requester',
  'We received your cancellation request',
  '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5"><h2 style="margin:0 0 12px">Thanks, {{requester_name}}</h2><p>We received your request to cancel <strong>{{platform}} {{product}}</strong>. It''s now pending cancellation — we''ll email you once it''s done.</p><p><strong>Reason:</strong> {{reason}}</p></div>'
),
(
  'cancellation_done',
  'Cancellation completed → requester',
  'Your subscription has been cancelled',
  '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5"><h2 style="margin:0 0 12px">Done, {{requester_name}}</h2><p>Your subscription to <strong>{{platform}} {{product}}</strong> has been cancelled.</p></div>'
);
