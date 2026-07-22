-- Migration #13: statement capture / subscription backfill
-- ---------------------------------------------------------------------------
-- Onboarding tool: pull each card's recent bank statement and map the recurring
-- charges into real subscriptions, assigned to a team. Two pieces:
--   1) subscriptions.source_transaction_id — the bank transaction a subscription
--      was captured from. Lets the Capture page mark a charge "mapped" and links
--      back to the subscription it became (so a charge isn't mapped twice).
--   2) app_settings.capture_enabled — a feature flag; the admin turns Capture off
--      once every live subscription has been mapped.

alter table public.subscriptions add column source_transaction_id text;

create index idx_subscriptions_source_tx
  on public.subscriptions (source_transaction_id)
  where source_transaction_id is not null;

-- App-wide settings singleton (the id=true trick caps it at one row).
create table public.app_settings (
  id boolean primary key default true check (id),
  capture_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();
