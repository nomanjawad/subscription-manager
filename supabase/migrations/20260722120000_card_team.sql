-- Migration #6: assign cards to teams; track ACTUAL spend per team
-- ---------------------------------------------------------------------------
-- A card belongs to at most one team. Transactions never store a team — they
-- inherit it live from the card they were charged on (matched on
-- mercury_card_id). Re-assigning a card re-buckets its whole transaction
-- history automatically. This is the "actual money out" counterpart to
-- spend_by_team() (which is planned/committed spend from subscriptions).
--
-- Consistent with the existing design: service-role-only access, RLS stays
-- deny-all, every function is security_invoker with an empty search_path.

alter table public.cards
  add column team_id uuid references public.teams(id) on delete set null;
create index idx_cards_team on public.cards (team_id);

-- Actual money-out per team, derived from transactions → card → team.
-- Transactions on an unassigned card (team_id is null) or on a card we haven't
-- synced yet collapse into the 'Unassigned' bucket (team_id null) — that bucket
-- is what the dashboard's "unassigned card spend" callout reads.
create function public.spend_by_team_actual()
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
  group by c.team_id, t.name
  order by 3 desc
$$;
