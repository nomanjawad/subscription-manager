// lib/email — the transactional email templates. These are the single source
// of truth (no DB table, no editor): simple, inline-styled HTML that email
// clients render reliably. Merge tags are {{snake_case}} tokens, filled per
// recipient at send time (see merge.ts — values are HTML-escaped).
export type EmailTemplateKey =
  | "request_submitted_lead"
  | "request_submitted_confirm"
  | "request_approved"
  | "request_approved_buyer"
  | "request_rejected"
  | "request_purchased"
  | "request_unrouted_admin"
  | "cancellation_pending_buyer"
  | "cancellation_done";

interface EmailTemplate {
  subject: string;
  html: string;
}

const wrap = (body: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5;font-size:14px">${body}</div>`;

export const DEFAULT_TEMPLATES: Record<EmailTemplateKey, EmailTemplate> = {
  // 1) Submitted → team lead of the routed team.
  request_submitted_lead: {
    subject: "New subscription request from {{requester_name}}",
    html: wrap(
      "<h2 style='margin:0 0 12px'>New subscription request</h2><p><strong>{{requester_name}}</strong> ({{requester_email}}) requested a subscription for your team <strong>{{team}}</strong>.</p><p><strong>Platform:</strong> {{platform}} {{product}}<br><strong>Estimated amount:</strong> {{amount}} ({{cycle}})<br><strong>Reason:</strong> {{reason}}</p><p>Review it in the Requests page to approve or reject.</p>",
    ),
  },
  // 1) Submitted → confirmation to the requester.
  request_submitted_confirm: {
    subject: "We received your subscription request",
    html: wrap(
      "<h2 style='margin:0 0 12px'>Thanks, {{requester_name}}!</h2><p>We received your request for <strong>{{platform}} {{product}}</strong> ({{amount}}, {{cycle}}). It's now under review — we'll email you when there's an update.</p>",
    ),
  },
  // 2) Approved → the requester (first).
  request_approved: {
    subject: "Your subscription request was approved",
    html: wrap(
      "<h2 style='margin:0 0 12px'>Good news, {{requester_name}}!</h2><p>Your request for <strong>{{platform}} {{product}}</strong> ({{amount}}) for team <strong>{{team}}</strong> was <strong>approved</strong> and is queued for purchase.</p>",
    ),
  },
  // 2) Approved → the buyers (there's something to buy).
  request_approved_buyer: {
    subject: "Approved request ready to buy — {{platform}}",
    html: wrap(
      "<h2 style='margin:0 0 12px'>A request is approved and ready to purchase</h2><p><strong>{{platform}} {{product}}</strong> for team <strong>{{team}}</strong> — estimated {{amount}} ({{cycle}}).</p><p>Requested by {{requester_name}} ({{requester_email}}).</p><p><strong>Credentials provided:</strong> {{credentials}}</p><p>Open the To-buy queue to complete the purchase.</p>",
    ),
  },
  // 3) Rejected → the requester.
  request_rejected: {
    subject: "Your subscription request was declined",
    html: wrap(
      "<h2 style='margin:0 0 12px'>Update on your request</h2><p>Hi {{requester_name}}, your request for <strong>{{platform}} {{product}}</strong> was <strong>declined</strong>.</p><p><strong>Reason:</strong> {{reason}}</p>",
    ),
  },
  // 4) Purchased → the requester AND the approver.
  request_purchased: {
    subject: "Subscription purchased — {{platform}}",
    html: wrap(
      "<h2 style='margin:0 0 12px'>{{platform}} {{product}} is now active</h2><p>The subscription requested by <strong>{{requester_name}}</strong> ({{requester_email}}) for team <strong>{{team}}</strong> has been purchased.</p><p><strong>Amount:</strong> {{amount}}<br><strong>Next renewal:</strong> {{next_renewal_date}}</p>",
    ),
  },
  // Unrouted request (no matching team) → admins to triage.
  request_unrouted_admin: {
    subject: "A subscription request needs triage",
    html: wrap(
      "<h2 style='margin:0 0 12px'>Unrouted request</h2><p><strong>{{requester_name}}</strong> ({{requester_email}}) submitted a request that didn't match any registered user, so it wasn't routed to a team.</p><p><strong>Platform:</strong> {{platform}} {{product}}<br><strong>Estimated amount:</strong> {{amount}} ({{cycle}})</p><p>Assign it a team in the Requests page, or add the requester as a user.</p>",
    ),
  },
  // 5) Cancellation pending → the buyers (they finalize).
  cancellation_pending_buyer: {
    subject: "Cancellation pending — {{platform}}",
    html: wrap(
      "<h2 style='margin:0 0 12px'>A subscription is pending cancellation</h2><p><strong>{{platform}} {{product}}</strong> (team <strong>{{team}}</strong>) has been requested for cancellation.</p><p><strong>Requested by:</strong> {{requester}}<br><strong>Reason:</strong> {{reason}}</p><p>Open the Cancellations page to mark it cancelled.</p>",
    ),
  },
  // 5) Cancelled → the person who created the cancellation request.
  cancellation_done: {
    subject: "Your subscription has been cancelled",
    html: wrap(
      "<h2 style='margin:0 0 12px'>Done, {{requester_name}}</h2><p>Your request to cancel <strong>{{platform}} {{product}}</strong> is complete — the subscription has been cancelled.</p>",
    ),
  },
};
