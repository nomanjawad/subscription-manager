-- Migration #15: encrypted credentials
-- ---------------------------------------------------------------------------
-- Secrets are encrypted in the app (AES-256-GCM, lib/crypto/secrets.ts) with
-- a key that never reaches the database. Here we only store ciphertext
-- ("v1:<iv>:<tag>:<data>") and enforce that shape with CHECK constraints, so
-- a plaintext secret can't be written by mistake.
--
-- 1) request_credentials — the requester's platform login, moved out of
--    subscription_requests into its own table so ordinary request reads
--    (select *) never carry it. One row per request; admins reveal it.
-- 2) credential_reveals — audit trail: who revealed which request's
--    credentials, and when. revealed_by has no FK: bootstrap admins
--    (ADMIN_EMAILS) may have no profiles row.
-- 3) subscription_requests.credentials (plaintext) is dropped.
-- 4) smtp_settings.password and bank_settings.api_token now hold ciphertext.
--
-- Same conventions as the rest of the schema: RLS on with no policies
-- (deny-all) — only the service role reads or writes these tables.

create table public.request_credentials (
  request_id uuid primary key
    references public.subscription_requests(id) on delete cascade,
  ciphertext text not null check (ciphertext like 'v1:%'),
  created_at timestamptz not null default now()
);

alter table public.request_credentials enable row level security;

create table public.credential_reveals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.subscription_requests(id) on delete set null,
  revealed_by uuid not null,
  revealed_by_email text not null,
  revealed_at timestamptz not null default now()
);

create index idx_credential_reveals_request on public.credential_reveals (request_id);

alter table public.credential_reveals enable row level security;

alter table public.subscription_requests drop column credentials;

alter table public.smtp_settings
  add constraint smtp_settings_password_encrypted
  check (password is null or password like 'v1:%');

alter table public.bank_settings
  add constraint bank_settings_api_token_encrypted
  check (api_token is null or api_token like 'v1:%');

comment on table public.request_credentials is
  'Requester-supplied platform login, AES-256-GCM encrypted by the app. Admin reveal only.';
comment on column public.smtp_settings.password is
  'AES-256-GCM ciphertext (app-encrypted).';
comment on column public.bank_settings.api_token is
  'AES-256-GCM ciphertext (app-encrypted).';
