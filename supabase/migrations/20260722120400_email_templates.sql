-- Migration #10: editable email templates
-- ---------------------------------------------------------------------------
-- One row per transactional email. `html` is the body sent (with {{merge_tags}}
-- filled at send time); `design` holds the Unlayer editor's JSON so the admin
-- can re-open and visually edit it. Seeded with sensible defaults so email
-- works on day one; the admin customizes via the Email templates page.
-- Service-role only, RLS deny-all like every other table.

create table public.email_templates (
  key text primary key,
  name text not null,
  subject text not null,
  html text not null,
  design jsonb,
  updated_at timestamptz not null default now()
);

alter table public.email_templates enable row level security;

create trigger email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

-- Seed defaults. Keep the HTML simple + inline-styled (email clients ignore
-- <style>/external CSS). Merge tags are {{snake_case}} tokens.
insert into public.email_templates (key, name, subject, html) values
(
  'request_submitted_lead',
  'Request submitted → team lead',
  'New subscription request from {{requester_name}}',
  '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5"><h2 style="margin:0 0 12px">New subscription request</h2><p><strong>{{requester_name}}</strong> ({{requester_email}}) requested a subscription for your team <strong>{{team}}</strong>.</p><p><strong>Platform:</strong> {{platform}} {{product}}<br><strong>Estimated amount:</strong> {{amount}} ({{cycle}})<br><strong>Reason:</strong> {{reason}}</p><p>Review it in the Requests page to approve or reject.</p></div>'
),
(
  'request_submitted_confirm',
  'Request submitted → requester confirmation',
  'We received your subscription request',
  '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5"><h2 style="margin:0 0 12px">Thanks, {{requester_name}}!</h2><p>We received your request for <strong>{{platform}} {{product}}</strong> ({{amount}}, {{cycle}}). It''s now under review — we''ll email you when there''s an update.</p></div>'
),
(
  'request_approved',
  'Request approved → requester',
  'Your subscription request was approved',
  '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5"><h2 style="margin:0 0 12px">Good news, {{requester_name}}!</h2><p>Your request for <strong>{{platform}} {{product}}</strong> ({{amount}}) for team <strong>{{team}}</strong> was <strong>approved</strong> and is queued for purchase.</p></div>'
),
(
  'request_rejected',
  'Request rejected → requester',
  'Your subscription request was declined',
  '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5"><h2 style="margin:0 0 12px">Update on your request</h2><p>Hi {{requester_name}}, your request for <strong>{{platform}} {{product}}</strong> was <strong>declined</strong>.</p><p><strong>Reason:</strong> {{reason}}</p></div>'
),
(
  'request_purchased',
  'Purchased → requester',
  'Your subscription is now active',
  '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5"><h2 style="margin:0 0 12px">You''re all set, {{requester_name}}!</h2><p>Your subscription to <strong>{{platform}} {{product}}</strong> ({{amount}}) is now active. Next renewal: <strong>{{next_renewal_date}}</strong>.</p></div>'
),
(
  'request_unrouted_admin',
  'Unrouted request → admin',
  'A subscription request needs triage',
  '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5"><h2 style="margin:0 0 12px">Unrouted request</h2><p><strong>{{requester_name}}</strong> ({{requester_email}}) submitted a request that didn''t match any registered user, so it wasn''t routed to a team.</p><p><strong>Platform:</strong> {{platform}} {{product}}<br><strong>Estimated amount:</strong> {{amount}} ({{cycle}})</p><p>Assign it a team in the Requests page, or add the requester as a user.</p></div>'
);
