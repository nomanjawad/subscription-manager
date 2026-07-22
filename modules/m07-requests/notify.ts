// m07-requests — email notifications for the request lifecycle. Thin layer over
// lib/email: resolves recipients (leads / buyers / admins) and builds merge vars
// from a request. Every send is best-effort (sendTemplateEmail never throws), so
// a notification failure never blocks the underlying action.
//
// Who gets what:
//   submitted   → requester (confirm) + team lead   [+ admins if unrouted]
//   approved    → requester (first) + all buyers
//   rejected    → requester
//   purchased   → requester + the approver
import { sendTemplateEmail } from "@/lib/email/send";
import {
  allAdminEmails,
  buyerEmails,
  teamLeadEmails,
  teamName,
} from "@/lib/email/recipients";
import type { MergeVars } from "@/lib/email/merge";
import type { BillingCycle } from "@/lib/types";

/** The request fields every notification needs. */
export interface NotifiableRequest {
  requester_name: string;
  requester_email: string;
  platform: string;
  product: string | null;
  reason: string | null;
  amount_estimate: number | null;
  billing_cycle: BillingCycle;
  credentials: string | null;
  team_id: string | null;
}

function fmtAmount(amount: number | null): string {
  return amount === null ? "—" : `$${Number(amount).toFixed(2)}`;
}

function baseVars(req: NotifiableRequest, name: string | null): MergeVars {
  return {
    requester_name: req.requester_name,
    requester_email: req.requester_email,
    platform: req.platform,
    product: req.product ?? "",
    amount: fmtAmount(req.amount_estimate),
    cycle: req.billing_cycle,
    reason: req.reason ?? "—",
    credentials: req.credentials ?? "None provided",
    team: name ?? "Unassigned",
  };
}

/** Tell every buyer an approved request is ready to purchase. */
async function notifyBuyersApproved(
  req: NotifiableRequest,
  vars: MergeVars,
): Promise<void> {
  const buyers = await buyerEmails();
  if (buyers.length > 0) {
    await sendTemplateEmail("request_approved_buyer", buyers, vars);
  }
}

/**
 * A request was just submitted. Auto-approved → tell the requester it's approved
 * and alert buyers. Otherwise → confirm to the requester, notify the team lead,
 * and (if it routed to no team) alert admins to triage it.
 */
export async function notifySubmitted(
  req: NotifiableRequest,
  autoApproved: boolean,
): Promise<void> {
  const name = await teamName(req.team_id);
  const vars = baseVars(req, name);

  if (autoApproved) {
    await sendTemplateEmail("request_approved", req.requester_email, vars);
    await notifyBuyersApproved(req, vars);
    return;
  }

  await sendTemplateEmail("request_submitted_confirm", req.requester_email, vars);

  if (req.team_id) {
    const leads = await teamLeadEmails(req.team_id);
    if (leads.length > 0) {
      await sendTemplateEmail("request_submitted_lead", leads, vars);
    }
  } else {
    const admins = await allAdminEmails();
    await sendTemplateEmail("request_unrouted_admin", admins, vars);
  }
}

/** A request was approved or rejected — tell the requester (and, on approval,
 *  every buyer that there's something to buy). */
export async function notifyReviewed(
  req: NotifiableRequest,
  status: "approved" | "rejected",
): Promise<void> {
  const name = await teamName(req.team_id);
  const vars = baseVars(req, name);

  if (status === "approved") {
    await sendTemplateEmail("request_approved", req.requester_email, vars);
    await notifyBuyersApproved(req, vars);
    return;
  }
  await sendTemplateEmail("request_rejected", req.requester_email, vars);
}

/** A request was purchased — tell the requester and the approver. */
export async function notifyPurchased(
  req: NotifiableRequest,
  extra: {
    amount: number;
    currency: string;
    nextRenewalDate: string;
    approverEmail: string | null;
  },
): Promise<void> {
  const name = await teamName(req.team_id);
  const vars: MergeVars = {
    ...baseVars(req, name),
    amount: `${extra.currency} ${extra.amount.toFixed(2)}`,
    next_renewal_date: extra.nextRenewalDate,
  };
  const recipients = Array.from(
    new Set([req.requester_email, extra.approverEmail].filter(Boolean)),
  ) as string[];
  await sendTemplateEmail("request_purchased", recipients, vars);
}
