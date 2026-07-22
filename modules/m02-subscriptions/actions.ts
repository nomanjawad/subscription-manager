"use server";

// m02-subscriptions — lifecycle server actions. Inputs are validated by hand
// (no schema deps); all writes revalidate /subscriptions.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { BillingCycle } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Trimmed string field, or null when missing/empty. */
function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

interface SubscriptionInput {
  platform: string;
  product: string | null;
  order_number: string | null;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_renewal_date: string;
  card_id: string | null;
  account_email: string | null;
  notes: string | null;
  tag: string | null;
  team_id: string | null;
}

/** Optional tag: trimmed, lowercased, max 40 chars. */
function parseTag(formData: FormData): string | null {
  const raw = text(formData, "tag");
  if (raw === null) return null;
  const tag = raw.toLowerCase();
  if (tag.length > 40) {
    throw new Error("Tag must be at most 40 characters.");
  }
  return tag;
}

function parseSubscriptionForm(formData: FormData): SubscriptionInput {
  const platform = text(formData, "platform");
  if (!platform) {
    throw new Error("Platform is required.");
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

  const billingCycle = text(formData, "billing_cycle") ?? "monthly";
  if (billingCycle !== "monthly" && billingCycle !== "yearly") {
    throw new Error("Billing cycle must be 'monthly' or 'yearly'.");
  }

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

  const teamId = text(formData, "team_id");
  if (teamId !== null && !UUID_RE.test(teamId)) {
    throw new Error("Team must be a valid team id.");
  }

  return {
    platform,
    product: text(formData, "product"),
    order_number: text(formData, "order_number"),
    amount: Math.round(amount * 100) / 100,
    currency,
    billing_cycle: billingCycle,
    next_renewal_date: nextRenewalDate,
    card_id: cardId,
    account_email: text(formData, "account_email"),
    notes: text(formData, "notes"),
    tag: parseTag(formData),
    team_id: teamId,
  };
}

function assertUuid(id: string, what: string): void {
  if (!UUID_RE.test(id)) {
    throw new Error(`Invalid ${what} id.`);
  }
}

/**
 * Authorize + validate the requested team_id against the current session.
 * A team lead may only target their own team; an admin may target any team
 * or leave it unassigned. A non-null team must reference an existing team.
 */
async function authorizeTeamId(
  supabase: ReturnType<typeof createServiceClient>,
  teamId: string | null,
): Promise<void> {
  const session = await getSessionUser();
  if (!session) {
    throw new Error("You must be signed in to manage subscriptions.");
  }

  if (session.role === "team_lead") {
    if (session.teamId === null) {
      throw new Error("You haven't been assigned to a team yet.");
    }
    if (teamId !== session.teamId) {
      throw new Error("You may only assign subscriptions to your own team.");
    }
  }

  if (teamId !== null) {
    const { data, error } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to validate team: ${error.message}`);
    }
    if (!data) {
      throw new Error("Team does not exist.");
    }
  }
}

/**
 * Authorize a mutation against an EXISTING subscription. Admins may act on any
 * subscription; a team lead may only act on one already belonging to their own
 * team. Guards cancel/reactivate/update so a team lead can't act on — or, on
 * update, hijack into their own team — another team's subscription via a
 * crafted id. Server actions are public endpoints, so this check can't live in
 * the UI.
 */
async function authorizeExistingSubscription(
  supabase: ReturnType<typeof createServiceClient>,
  id: string,
): Promise<void> {
  const session = await getSessionUser();
  if (!session) {
    throw new Error("You must be signed in to manage subscriptions.");
  }
  if (session.role === "admin") return;
  if (session.teamId === null) {
    throw new Error("You haven't been assigned to a team yet.");
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("team_id")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load subscription: ${error.message}`);
  }
  if (!data || data.team_id !== session.teamId) {
    throw new Error("You may only manage your own team's subscriptions.");
  }
}

export async function createSubscription(formData: FormData): Promise<void> {
  const session = await getSessionUser();
  if (!session) {
    throw new Error("You must be signed in to manage subscriptions.");
  }
  // Creating subscriptions belongs to the purchasing flow: admins + buyers.
  // (Team leads approve/reject requests; they no longer create directly.)
  if (session.role !== "admin" && session.role !== "buyer") {
    throw new Error("Only buyers and admins can create subscriptions.");
  }

  const input = parseSubscriptionForm(formData);

  const supabase = createServiceClient();
  await authorizeTeamId(supabase, input.team_id);
  // Stamp who bought it, so it shows in the buyer's "My purchases".
  const { error } = await supabase
    .from("subscriptions")
    .insert({ ...input, purchased_by: session.id });
  if (error) {
    throw new Error(`Failed to create subscription: ${error.message}`);
  }

  revalidatePath("/subscriptions");
  // Back to the table after a successful create.
  redirect("/subscriptions");
}

export async function updateSubscription(
  id: string,
  formData: FormData,
): Promise<void> {
  assertUuid(id, "subscription");
  const input = parseSubscriptionForm(formData);

  const supabase = createServiceClient();
  // Must already own the subscription (blocks hijacking another team's row),
  // and the destination team must also be theirs.
  await authorizeExistingSubscription(supabase, id);
  await authorizeTeamId(supabase, input.team_id);
  const { error } = await supabase
    .from("subscriptions")
    .update(input)
    .eq("id", id);
  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  revalidatePath("/subscriptions");
  // Leave edit mode (drops the ?edit=<id> search param).
  redirect("/subscriptions");
}

async function setStatus(
  id: string,
  status: "active" | "cancelled",
): Promise<void> {
  assertUuid(id, "subscription");

  const supabase = createServiceClient();
  await authorizeExistingSubscription(supabase, id);
  const { error } = await supabase
    .from("subscriptions")
    .update({ status })
    .eq("id", id);
  if (error) {
    throw new Error(
      `Failed to mark subscription ${status}: ${error.message}`,
    );
  }

  revalidatePath("/subscriptions");
}

// Direct cancellation is intentionally NOT exposed: cancelling goes through the
// pending-cancellation flow (m13-cancellations) so only a buyer/admin finalizes.
// setStatus stays for reactivation.
export async function reactivateSubscription(id: string): Promise<void> {
  await setStatus(id, "active");
}
