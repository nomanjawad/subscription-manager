-- Migration #11: request credentials + reviewer + SMTP settings
-- ---------------------------------------------------------------------------
-- 1) subscription_requests.credentials — an OPTIONAL free-text field where a
--    requester can hand over login details for the platform they want, so the
--    buyer can complete the purchase. Sensitive: service-role only (deny-all
--    RLS), surfaced only to admins/buyers in the purchase dialog.
-- 2) subscription_requests.reviewed_by — who approved/rejected the request, so
--    the "purchased" email can notify the approver as well as the requester.
-- 3) smtp_settings — a single-row table holding the outbound SMTP config the
--    admin edits in the app (Users page). lib/email/smtp.ts reads this first and
--    falls back to SMTP_* env vars. deny-all RLS; service-role only.

alter table public.subscription_requests
  add column credentials text;

alter table public.subscription_requests
  add column reviewed_by uuid references public.profiles(id) on delete set null;

-- ── SMTP settings (singleton) ──────────────────────────────────────────────
-- The `id boolean primary key default true check (id)` trick guarantees at most
-- one row: any insert must use id=true, and true is unique.
create table public.smtp_settings (
  id boolean primary key default true check (id),
  host text,
  port integer,
  username text,
  password text,
  from_email text,
  updated_at timestamptz not null default now()
);

alter table public.smtp_settings enable row level security;

create trigger smtp_settings_updated_at
  before update on public.smtp_settings
  for each row execute function public.set_updated_at();
