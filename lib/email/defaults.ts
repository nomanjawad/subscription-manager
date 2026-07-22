// lib/email — built-in fallback templates. The DB (email_templates) is the
// source of truth once migrated + editable via Unlayer; these are used only if
// a row is missing (e.g. migration not yet applied) so sending never breaks.
export type EmailTemplateKey =
  | "request_submitted_lead"
  | "request_submitted_confirm"
  | "request_approved"
  | "request_rejected"
  | "request_purchased"
  | "request_unrouted_admin"
  | "cancellation_received"
  | "cancellation_done";

interface DefaultTemplate {
  name: string;
  subject: string;
  html: string;
}

const wrap = (body: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5">${body}</div>`;

export const DEFAULT_TEMPLATES: Record<EmailTemplateKey, DefaultTemplate> = {
  request_submitted_lead: {
    name: "Request submitted → team lead",
    subject: "New subscription request from {{requester_name}}",
    html: wrap(
      "<h2>New subscription request</h2><p><strong>{{requester_name}}</strong> ({{requester_email}}) requested {{platform}} {{product}} — {{amount}} ({{cycle}}) for team {{team}}. Reason: {{reason}}. Review it in Requests.</p>",
    ),
  },
  request_submitted_confirm: {
    name: "Request submitted → requester confirmation",
    subject: "We received your subscription request",
    html: wrap(
      "<h2>Thanks, {{requester_name}}!</h2><p>We received your request for {{platform}} {{product}} ({{amount}}, {{cycle}}). It's under review.</p>",
    ),
  },
  request_approved: {
    name: "Request approved → requester",
    subject: "Your subscription request was approved",
    html: wrap(
      "<h2>Good news, {{requester_name}}!</h2><p>Your request for {{platform}} {{product}} ({{amount}}) was approved and is queued for purchase.</p>",
    ),
  },
  request_rejected: {
    name: "Request rejected → requester",
    subject: "Your subscription request was declined",
    html: wrap(
      "<h2>Update on your request</h2><p>Hi {{requester_name}}, your request for {{platform}} {{product}} was declined. Reason: {{reason}}</p>",
    ),
  },
  request_purchased: {
    name: "Purchased → requester",
    subject: "Your subscription is now active",
    html: wrap(
      "<h2>You're all set, {{requester_name}}!</h2><p>Your subscription to {{platform}} {{product}} ({{amount}}) is active. Next renewal: {{next_renewal_date}}.</p>",
    ),
  },
  request_unrouted_admin: {
    name: "Unrouted request → admin",
    subject: "A subscription request needs triage",
    html: wrap(
      "<h2>Unrouted request</h2><p>{{requester_name}} ({{requester_email}}) submitted a request that matched no user: {{platform}} {{product}} — {{amount}} ({{cycle}}). Assign it a team or add the requester.</p>",
    ),
  },
  cancellation_received: {
    name: "Cancellation received → requester",
    subject: "We received your cancellation request",
    html: wrap(
      "<h2>Thanks, {{requester_name}}</h2><p>We received your request to cancel {{platform}} {{product}}. It's pending cancellation. Reason: {{reason}}</p>",
    ),
  },
  cancellation_done: {
    name: "Cancellation completed → requester",
    subject: "Your subscription has been cancelled",
    html: wrap(
      "<h2>Done, {{requester_name}}</h2><p>Your subscription to {{platform}} {{product}} has been cancelled.</p>",
    ),
  },
};
