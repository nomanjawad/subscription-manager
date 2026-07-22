// m07-requests — email notifications for the request lifecycle. Thin layer over
// lib/email: resolves recipients (team leads / admins) and builds merge vars
// from a request. Every send is best-effort (sendTemplateEmail never throws),
// so a notification failure never blocks the underlying action.
import { adminEmails } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTemplateEmail } from "@/lib/email/send";
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
  team_id: string | null;
}

function fmtAmount(amount: number | null): string {
  return amount === null ? "—" : `$${Number(amount).toFixed(2)}`;
}

function baseVars(req: NotifiableRequest, teamName: string | null): MergeVars {
  return {
    requester_name: req.requester_name,
    requester_email: req.requester_email,
    platform: req.platform,
    product: req.product ?? "",
    amount: fmtAmount(req.amount_estimate),
    cycle: req.billing_cycle,
    reason: req.reason ?? "—",
    team: teamName ?? "Unassigned",
  };
}

async function teamLeadEmails(teamId: string | null): Promise<string[]> {
  if (!teamId) return [];
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "team_lead")
    .eq("team_id", teamId);
  return ((data ?? []) as { email: string }[]).map((r) => r.email);
}

async function allAdminEmails(): Promise<string[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "admin");
  const dbAdmins = ((data ?? []) as { email: string }[]).map((r) => r.email);
  return Array.from(new Set([...adminEmails(), ...dbAdmins]));
}

async function teamName(teamId: string | null): Promise<string | null> {
  if (!teamId) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .maybeSingle();
  return (data as { name: string } | null)?.name ?? null;
}

/**
 * A request was just submitted. Auto-approved → tell the requester it's approved
 * (no lead review). Otherwise → confirm to the requester, notify the team lead,
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

/** A request was approved or rejected — tell the requester. */
export async function notifyReviewed(
  req: NotifiableRequest,
  status: "approved" | "rejected",
): Promise<void> {
  const name = await teamName(req.team_id);
  const vars = baseVars(req, name);
  await sendTemplateEmail(
    status === "approved" ? "request_approved" : "request_rejected",
    req.requester_email,
    vars,
  );
}

/** A request was purchased — tell the requester their subscription is live. */
export async function notifyPurchased(
  req: NotifiableRequest,
  extra: { amount: number; currency: string; nextRenewalDate: string },
): Promise<void> {
  const name = await teamName(req.team_id);
  const vars: MergeVars = {
    ...baseVars(req, name),
    amount: `${extra.currency} ${extra.amount.toFixed(2)}`,
    next_renewal_date: extra.nextRenewalDate,
  };
  await sendTemplateEmail("request_purchased", req.requester_email, vars);
}
