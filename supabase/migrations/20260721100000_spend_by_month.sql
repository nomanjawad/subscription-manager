-- Migration #4: monthly spend time-series for the admin dashboard charts
-- ---------------------------------------------------------------------------
-- Actual money-out (from synced Mercury transactions) bucketed by calendar
-- month, optionally filtered to a single card. Months with no spend are
-- gap-filled via generate_series so the chart has a continuous x-axis.
-- Same conventions as the other RPCs: security_invoker, empty search_path,
-- amounts are dollars (transactions.amount is negative for money out).

create function public.spend_by_month(
  p_months int default 12,
  p_card_id text default null
)
returns table (month date, total_out numeric, transaction_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with months as (
    select (date_trunc('month', current_date) - make_interval(months => n))::date as m
    from generate_series(0, greatest(p_months, 1) - 1) as n
  )
  select
    m.m,
    coalesce(sum(-t.amount), 0),
    count(t.id)
  from months m
  left join public.transactions t
    on date_trunc('month', coalesce(t.posted_at, t.created_at_mercury))::date = m.m
   and t.amount < 0
   and t.status not in ('failed', 'cancelled', 'reversed', 'blocked')
   and (p_card_id is null or t.mercury_card_id = p_card_id)
  group by m.m
  order by m.m asc
$$;
