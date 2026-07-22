-- Migration #12: bank (Mercury) API settings
-- ---------------------------------------------------------------------------
-- A single-row table holding the Mercury API config the admin edits in-app
-- (Settings → Bank API). lib/mercury.ts reads this first and falls back to the
-- MERCURY_API_URL / MERCURY_API_TOKEN env vars. The `id boolean primary key
-- default true check (id)` trick guarantees at most one row. Holds a bank
-- credential — service-role only, deny-all RLS like every other table.

create table public.bank_settings (
  id boolean primary key default true check (id),
  api_url text,
  api_token text,
  updated_at timestamptz not null default now()
);

alter table public.bank_settings enable row level security;

create trigger bank_settings_updated_at
  before update on public.bank_settings
  for each row execute function public.set_updated_at();
