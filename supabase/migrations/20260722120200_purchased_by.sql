-- Migration #8: record who bought each subscription
-- ---------------------------------------------------------------------------
-- When a buyer (or admin) marks a request purchased or creates a subscription,
-- their profile is stamped on purchased_by. ON DELETE SET NULL: removing the
-- buyer's account never deletes the subscription — it just drops the link.
-- subscription_overview is refreshed to expose the buyer's name so the UI can
-- show "bought by" without a JS-side join.

alter table public.subscriptions
  add column purchased_by uuid references public.profiles(id) on delete set null;
create index idx_subscriptions_purchased_by on public.subscriptions (purchased_by);

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
  pb.full_name     as purchased_by_name
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
