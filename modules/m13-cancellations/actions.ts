"use server";

// m13-cancellations — cancellation lifecycle server actions.
//   submitCancellation   — PUBLIC form (/cancellation-request). Free-text,
//                          email→team routing, lands as 'pending'.
//   requestCancellation  — team lead (own team) / admin flags a subscription row
//                          as pending cancellation (does NOT cancel it yet).
//   completeCancellation — buyer / admin finalizes: 'pending' → 'cancelled', and
//                          flips the linked subscription to cancelled.
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/auth";
import { sendTemplateEmail } from "@/lib/email/send";

export interface CancelState {
  ok: boolean;
  error: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHORT_MAX = 200;
const LONG_MAX = 2000;

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function assertUuid(id: string, what: string): void {
  if (!UUID_RE.test(id)) throw new Error(`Invalid ${what} id.`);
}

// ── Public: submit a cancellation request ──────────────────────────────────

export async function submitCancellation(
  _prev: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const fail = (error: string): CancelState => ({ ok: false, error });

  const requesterName = text(formData, "requester_name");
  if (!requesterName) return fail("Your name is required.");
  if (requesterName.length > SHORT_MAX) {
    return fail(`Name must be at most ${SHORT_MAX} characters.`);
  }

  const requesterEmail = text(formData, "requester_email");
  if (!requesterEmail) return fail("Your email is required.");
  if (requesterEmail.length > SHORT_MAX || !EMAIL_RE.test(requesterEmail)) {
    return fail("Please enter a valid email address.");
  }

  const platform = text(formData, "platform");
  if (!platform) return fail("Platform is required.");
  if (platform.length > SHORT_MAX) {
    return fail(`Platform must be at most ${SHORT_MAX} characters.`);
  }

  const product = text(formData, "product");
  if (product !== null && product.length > SHORT_MAX) {
    return fail(`Product must be at most ${SHORT_MAX} characters.`);
  }

  const reason = text(formData, "reason");
  if (reason !== null && reason.length > LONG_MAX) {
    return fail(`Reason must be at most ${LONG_MAX} characters.`);
  }

  const supabase = createServiceClient();

  // Team routing mirrors submitRequest: a registered member's team is
  // authoritative; otherwise fall back to the picked team (blank = unassigned).
  let teamId: string | null = null;

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("lead_id")
    .eq("email", requesterEmail.toLowerCase())
    .maybeSingle();
  if (memberError) {
    return fail("Could not submit right now. Please try again.");
  }
  if (member?.lead_id) {
    const { data: lead, error: leadError } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", member.lead_id)
      .maybeSingle();
    if (leadError) return fail("Could not submit right now. Please try again.");
    teamId = lead?.team_id ?? null;
  }

  if (teamId === null) {
    const teamRaw = text(formData, "team_id");
    if (teamRaw !== null) {
      if (!UUID_RE.test(teamRaw)) return fail("Please choose a valid team.");
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id")
        .eq("id", teamRaw)
        .maybeSingle();
      if (teamError) return fail("Could not submit right now. Please try again.");
      if (!team) return fail("Please choose a valid team.");
      teamId = team.id;
    }
  }

  const { error } = await supabase.from("cancellation_requests").insert({
    requester_name: requesterName,
    requester_email: requesterEmail,
    platform,
    product,
    reason,
    team_id: teamId,
    status: "pending",
  });
  if (error) {
    return fail("Could not submit right now. Please try again.");
  }

  await sendTemplateEmail("cancellation_received", requesterEmail, {
    requester_name: requesterName,
    platform,
    product: product ?? "",
    reason: reason ?? "—",
  });

  revalidatePath("/cancellations");
  return { ok: true, error: null };
}

// ── Internal: flag a subscription row for cancellation (pending) ───────────

export async function requestCancellation(subscriptionId: string): Promise<void> {
  assertUuid(subscriptionId, "subscription");

  const session = await getSessionUser();
  if (!session) throw new Error("You must be signed in.");
  if (session.role !== "admin" && session.role !== "team_lead") {
    throw new Error("Only admins and team leads can request cancellations.");
  }

  const supabase = createServiceClient();
  const { data: sub, error: loadError } = await supabase
    .from("subscriptions")
    .select("id, platform, product, team_id, status")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (loadError) throw new Error(`Failed to load subscription: ${loadError.message}`);
  if (!sub) throw new Error("Subscription not found.");

  // Team leads may only act on their own team's subscriptions.
  if (session.role === "team_lead") {
    if (session.teamId === null || sub.team_id !== session.teamId) {
      throw new Error("You may only cancel your own team's subscriptions.");
    }
  }

  if (sub.status !== "active") {
    throw new Error("Only active subscriptions can be cancelled.");
  }

  // Guard against a duplicate open request.
  const { data: existing, error: existingError } = await supabase
    .from("cancellation_requests")
    .select("id")
    .eq("subscription_id", subscriptionId)
    .eq("status", "pending")
    .maybeSingle();
  if (existingError) {
    throw new Error(`Failed to check pending cancellations: ${existingError.message}`);
  }
  if (existing) {
    throw new Error("This subscription already has a pending cancellation.");
  }

  const { error } = await supabase.from("cancellation_requests").insert({
    subscription_id: sub.id,
    platform: sub.platform,
    product: sub.product,
    team_id: sub.team_id,
    requested_by: session.id,
    status: "pending",
  });
  if (error) {
    throw new Error(`Failed to request cancellation: ${error.message}`);
  }

  revalidatePath("/subscriptions");
  revalidatePath("/cancellations");
}

// ── Finalize: buyer / admin marks a pending cancellation cancelled ─────────

export async function completeCancellation(cancellationId: string): Promise<void> {
  assertUuid(cancellationId, "cancellation");

  const session = await getSessionUser();
  if (!session) throw new Error("You must be signed in.");
  if (session.role !== "buyer" && session.role !== "admin") {
    throw new Error("Only buyers and admins can complete cancellations.");
  }

  const supabase = createServiceClient();
  const { data: cr, error: loadError } = await supabase
    .from("cancellation_requests")
    .select(
      "id, status, subscription_id, requester_name, requester_email, platform, product",
    )
    .eq("id", cancellationId)
    .maybeSingle();
  if (loadError) throw new Error(`Failed to load cancellation: ${loadError.message}`);
  if (!cr) throw new Error("Cancellation request not found.");
  if (cr.status !== "pending") {
    throw new Error("This request has already been resolved.");
  }

  // Mark cancelled (guarded on 'pending' so two buyers can't double-resolve).
  const { data: updated, error: updateError } = await supabase
    .from("cancellation_requests")
    .update({
      status: "cancelled",
      cancelled_by: session.id,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", cancellationId)
    .eq("status", "pending")
    .select("id");
  if (updateError) {
    throw new Error(`Failed to complete cancellation: ${updateError.message}`);
  }
  if (!updated || updated.length === 0) {
    throw new Error("This request has already been resolved.");
  }

  // Flip the linked subscription (if any) to cancelled.
  if (cr.subscription_id) {
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", cr.subscription_id);
    if (subError) {
      throw new Error(`Cancelled the request but failed to update the subscription: ${subError.message}`);
    }
  }

  if (cr.requester_email) {
    await sendTemplateEmail("cancellation_done", cr.requester_email, {
      requester_name: cr.requester_name ?? "there",
      platform: cr.platform ?? "",
      product: cr.product ?? "",
    });
  }

  revalidatePath("/cancellations");
  revalidatePath("/subscriptions");
  revalidatePath("/");
}
