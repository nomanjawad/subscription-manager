"use server";

// m02-subscriptions — lifecycle server actions. Inputs are validated by hand
// (no schema deps); all writes revalidate /subscriptions.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  };
}

function assertUuid(id: string, what: string): void {
  if (!UUID_RE.test(id)) {
    throw new Error(`Invalid ${what} id.`);
  }
}

export async function createSubscription(formData: FormData): Promise<void> {
  const input = parseSubscriptionForm(formData);

  const supabase = createServiceClient();
  const { error } = await supabase.from("subscriptions").insert(input);
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

export async function cancelSubscription(id: string): Promise<void> {
  await setStatus(id, "cancelled");
}

export async function reactivateSubscription(id: string): Promise<void> {
  await setStatus(id, "active");
}
