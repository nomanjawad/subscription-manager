-- Migration #9: member request activity + unrecognized requesters
-- ---------------------------------------------------------------------------
-- Two admin-directory reads, both aggregated in the DB (no JS joins):
--   * member_directory() gains request_count + last_requested_at, matched to
--     each member by email (case-insensitive) against subscription_requests.
--   * unrecognized_requesters() surfaces request emails that match NO member —
--     the flip side of member routing — so the admin can add them as members.
-- Changing member_directory's return columns requires DROP + CREATE (Postgres
-- can't CREATE OR REPLACE a function whose OUT signature changed).

drop function if exists public.member_directory();

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
  request_count bigint,
  last_requested_at timestamptz,
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
    p.full_name  as lead_name,
    p.email      as lead_email,
    p.team_id,
    t.name       as team_name,
    coalesce(rq.cnt, 0) as request_count,
    rq.last_at   as last_requested_at,
    m.created_at
  from public.members m
  left join public.profiles p on p.id = m.lead_id
  left join public.teams t on t.id = p.team_id
  left join lateral (
    select count(*) as cnt, max(sr.created_at) as last_at
    from public.subscription_requests sr
    where lower(sr.requester_email) = lower(m.email)
  ) rq on true
  order by m.created_at desc
$$;

-- Distinct request emails that don't match any member, with volume + recency.
create function public.unrecognized_requesters()
returns table (
  requester_email text,
  requester_name text,
  request_count bigint,
  last_requested_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    lower(sr.requester_email) as requester_email,
    (array_agg(sr.requester_name order by sr.created_at desc))[1] as requester_name,
    count(*) as request_count,
    max(sr.created_at) as last_requested_at
  from public.subscription_requests sr
  where lower(sr.requester_email) not in (
    select lower(m.email) from public.members m
  )
  group by lower(sr.requester_email)
  order by max(sr.created_at) desc
$$;
