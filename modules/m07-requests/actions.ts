"use server";

// m07-requests — request lifecycle server actions.
// requested → approved (pending purchase) → purchased
//           → rejected
// submitRequest handles PUBLIC input (the /request form): everything is
// trimmed, length-capped and validated; error messages never echo raw input.
// purchaseRequest is the sanctioned orchestrator that converts an approved
// request into a real subscriptions row.
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionUser, type SessionUser } from "@/lib/supabase/auth";
import type { BillingCycle, RequestStatus } from "@/lib/types";

export interface SubmitState {
  ok: boolean;
  error: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Deliberately simple: something@something.tld, no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SHORT_MAX = 200;
const LONG_MAX = 2000;

/** Trimmed string field, or null when missing/empty. */
function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function assertUuid(id: string, what: string): void {
  if (!UUID_RE.test(id)) {
    throw new Error(`Invalid ${what} id.`);
  }
}

/** Trim + cap an optional note supplied by an admin dialog. */
function cleanNote(note: string | null): string | null {
  if (typeof note !== "string") return null;
  const trimmed = note.trim().slice(0, LONG_MAX);
  return trimmed === "" ? null : trimmed;
}

function parseBillingCycle(value: string | null): BillingCycle {
  const cycle = value ?? "monthly";
  if (cycle !== "monthly" && cycle !== "yearly") {
    throw new Error("Billing cycle must be 'monthly' or 'yearly'.");
  }
  return cycle;
}

// ── Public: submit a request ─────────────────────────────────────────────

export async function submitRequest(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const fail = (error: string): SubmitState => ({ ok: false, error });

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

  let amountEstimate: number | null = null;
  const amountRaw = text(formData, "amount_estimate");
  if (amountRaw !== null) {
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail("Estimated amount must be a positive number.");
    }
    amountEstimate = Math.round(amount * 100) / 100;
  }

  let billingCycle: BillingCycle;
  try {
    billingCycle = parseBillingCycle(text(formData, "billing_cycle"));
  } catch {
    return fail("Billing cycle must be monthly or yearly.");
  }

  const supabase = createServiceClient();

  // Team routing. A chosen team must exist; if the system has any teams at
  // all, choosing one is required (a fresh install with no teams still works).
  let teamId: string | null = null;
  let autoApprove = false;

  const teamRaw = text(formData, "team_id");
  if (teamRaw !== null) {
    if (!UUID_RE.test(teamRaw)) {
      return fail("Please choose a valid team.");
    }
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, auto_approve")
      .eq("id", teamRaw)
      .maybeSingle();
    if (teamError) {
      // Never leak DB internals to the public form.
      return fail("Could not submit your request right now. Please try again.");
    }
    if (!team) {
      return fail("Please choose a valid team.");
    }
    teamId = team.id;
    autoApprove = team.auto_approve === true;
  } else {
    const { count, error: countError } = await supabase
      .from("teams")
      .select("id", { count: "exact", head: true });
    if (countError) {
      return fail("Could not submit your request right now. Please try again.");
    }
    if ((count ?? 0) > 0) {
      return fail("Please choose a team.");
    }
  }

  const { error } = await supabase.from("subscription_requests").insert({
    requester_name: requesterName,
    requester_email: requesterEmail,
    platform,
    product,
    reason,
    amount_estimate: amountEstimate,
    billing_cycle: billingCycle,
    team_id: teamId,
    ...(autoApprove
      ? {
          status: "approved" satisfies RequestStatus,
          reviewed_at: new Date().toISOString(),
          review_note: "Auto-approved (team policy)",
        }
      : { status: "requested" satisfies RequestStatus }),
  });
  if (error) {
    // Never leak DB internals to the public form.
    return fail("Could not submit your request right now. Please try again.");
  }

  revalidatePath("/requests");
  return { ok: true, error: null };
}

// ── Authorization ────────────────────────────────────────────────────────

/**
 * Guards a review/purchase action against the acting user's team scope.
 * Admins may act on any request; a team lead may only act on requests routed
 * to their own team.
 */
function authorizeForRequestTeam(
  session: SessionUser,
  requestTeamId: string | null,
): void {
  if (session.role === "admin") return;
  if (session.teamId && session.teamId === requestTeamId) return;
  throw new Error("You can only act on your own team's requests.");
}

// ── Admin: review (approve / reject) ─────────────────────────────────────

async function reviewRequest(
  id: string,
  status: Extract<RequestStatus, "approved" | "rejected">,
  note: string | null,
): Promise<void> {
  assertUuid(id, "request");

  const session = await getSessionUser();
  if (!session) throw new Error("You must be signed in to review requests.");

  const supabase = createServiceClient();

  const { data: existing, error: loadError } = await supabase
    .from("subscription_requests")
    .select("team_id")
    .eq("id", id)
    .maybeSingle();
  if (loadError) {
    throw new Error(`Failed to load request: ${loadError.message}`);
  }
  if (!existing) {
    throw new Error("Request not found.");
  }
  authorizeForRequestTeam(session, existing.team_id);

  const { data, error } = await supabase
    .from("subscription_requests")
    .update({
      status,
      review_note: cleanNote(note),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "requested") // only reviewable from 'requested'
    .select("id");

  if (error) {
    throw new Error(`Failed to ${status === "approved" ? "approve" : "reject"} request: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error("Request not found or already reviewed.");
  }

  revalidatePath("/requests");
}

export async function approveRequest(
  id: string,
  note: string | null,
): Promise<void> {
  await reviewRequest(id, "approved", note);
}

export async function rejectRequest(
  id: string,
  note: string | null,
): Promise<void> {
  await reviewRequest(id, "rejected", note);
}

// ── Admin: mark purchased (creates the real subscription) ────────────────

export async function purchaseRequest(
  id: string,
  formData: FormData,
): Promise<void> {
  assertUuid(id, "request");

  const session = await getSessionUser();
  if (!session) throw new Error("You must be signed in to purchase requests.");

  const supabase = createServiceClient();

  const { data: request, error: fetchError } = await supabase
    .from("subscription_requests")
    .select("id, status, platform, product, reviewed_at, team_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) {
    throw new Error(`Failed to load request: ${fetchError.message}`);
  }
  if (!request) {
    throw new Error("Request not found.");
  }
  authorizeForRequestTeam(session, request.team_id);
  if (request.status !== "approved") {
    throw new Error("Only approved requests can be marked purchased.");
  }

  const amountRaw = text(formData, "amount");
  if (!amountRaw) {
    throw new Error("Amount is required.");
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  const currency = (text(formData, "currency") ?? "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency must be a 3-letter code (e.g. USD).");
  }

  const billingCycle = parseBillingCycle(text(formData, "billing_cycle"));

  const nextRenewalDate = text(formData, "next_renewal_date");
  if (
    !nextRenewalDate ||
    !DATE_RE.test(nextRenewalDate) ||
    Number.isNaN(Date.parse(nextRenewalDate))
  ) {
    throw new Error("Next renewal date is required (YYYY-MM-DD).");
  }

  const cardId = text(formData, "card_id");
  if (cardId !== null && !UUID_RE.test(cardId)) {
    throw new Error("Card must be a valid card id.");
  }

  const accountEmail = text(formData, "account_email");
  if (accountEmail !== null) {
    if (accountEmail.length > SHORT_MAX || !EMAIL_RE.test(accountEmail)) {
      throw new Error("Account email must be a valid email address.");
    }
  }

  // Same normalization as m02-subscriptions: lowercase, max 40 chars — tags
  // from both entry points must be filter-compatible.
  const tag = text(formData, "tag")?.toLowerCase() ?? null;
  if (tag !== null && tag.length > 40) {
    throw new Error("Tag must be at most 40 characters.");
  }

  const notes = text(formData, "notes");
  if (notes !== null && notes.length > LONG_MAX) {
    throw new Error(`Notes must be at most ${LONG_MAX} characters.`);
  }

  // 1) Create the real subscription (platform/product come from the request).
  const { data: subscription, error: insertError } = await supabase
    .from("subscriptions")
    .insert({
      platform: request.platform,
      product: request.product,
      amount: Math.round(amount * 100) / 100,
      currency,
      billing_cycle: billingCycle,
      next_renewal_date: nextRenewalDate,
      card_id: cardId,
      account_email: accountEmail,
      tag,
      notes,
      team_id: request.team_id,
    })
    .select("id")
    .single();
  if (insertError || !subscription) {
    throw new Error(
      `Failed to create subscription: ${insertError?.message ?? "no row returned"}`,
    );
  }

  // 2) Link it on the request — still guarded on 'approved' so a concurrent
  //    reviewer can't double-convert the same request.
  const { data: updated, error: updateError } = await supabase
    .from("subscription_requests")
    .update({
      status: "purchased" satisfies RequestStatus,
      purchased_subscription_id: subscription.id,
      reviewed_at: request.reviewed_at ?? new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "approved")
    .select("id");

  if (updateError || !updated || updated.length === 0) {
    // Compensate: don't leave an orphan subscription behind.
    await supabase.from("subscriptions").delete().eq("id", subscription.id);
    throw new Error(
      updateError
        ? `Failed to mark request purchased: ${updateError.message}`
        : "Request was no longer approved — purchase rolled back.",
    );
  }

  revalidatePath("/requests");
  revalidatePath("/subscriptions");
  revalidatePath("/");
}
