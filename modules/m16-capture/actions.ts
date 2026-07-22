"use server";

// m16-capture — server actions for the statement-capture onboarding tool.
// Admin only. captureCardStatement pulls a card's month from Mercury into the
// transactions table; mapChargeToSubscription promotes a charge into a real
// subscription assigned to a team (which is when it shows up in the
// subscriptions list); setCaptureEnabled flips the feature flag.
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { listTransactions } from "@/lib/mercury";
import { upsertTransactions } from "@/modules/m03-transactions/sync";
import { monthRange, type CapturePeriod } from "./queries";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function captureCardStatement(
  cardId: string,
  period: CapturePeriod,
): Promise<{ upserted: number }> {
  await requireAdmin();
  if (!UUID_RE.test(cardId)) throw new Error("Invalid card id.");
  if (period !== "this" && period !== "last") {
    throw new Error("Invalid period.");
  }

  const supabase = createServiceClient();
  const { data: card, error } = await supabase
    .from("cards")
    .select("mercury_account_id, mercury_card_id")
    .eq("id", cardId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load card: ${error.message}`);
  if (!card) throw new Error("Card not found.");

  const { start, end } = monthRange(period);
  // Mercury lists per account; we store the whole account's window and the UI
  // filters to this card. (Cards on the same account get populated too.)
  const res = await listTransactions(card.mercury_account_id, {
    start,
    end,
    limit: 500,
  });
  const result = await upsertTransactions(res.transactions);

  revalidatePath("/capture");
  return result;
}

export interface MapChargeInput {
  sourceTransactionId: string;
  platform: string;
  product?: string | null;
  amount: number;
  currency: string;
  billingCycle: "monthly" | "yearly";
  nextRenewalDate: string;
  teamId: string;
  tag?: string | null;
}

export async function mapChargeToSubscription(
  input: MapChargeInput,
): Promise<void> {
  await requireAdmin();

  const platform = input.platform?.trim();
  if (!platform) throw new Error("Platform is required.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }
  const currency = (input.currency || "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency must be a 3-letter code (e.g. USD).");
  }
  if (input.billingCycle !== "monthly" && input.billingCycle !== "yearly") {
    throw new Error("Billing cycle must be 'monthly' or 'yearly'.");
  }
  if (
    !DATE_RE.test(input.nextRenewalDate) ||
    Number.isNaN(Date.parse(input.nextRenewalDate))
  ) {
    throw new Error("Next renewal date is required (YYYY-MM-DD).");
  }
  if (!UUID_RE.test(input.teamId)) {
    throw new Error("Choose a team to assign this subscription to.");
  }

  const tag = input.tag?.trim().toLowerCase() || null;
  if (tag && tag.length > 40) {
    throw new Error("Tag must be at most 40 characters.");
  }

  const supabase = createServiceClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", input.teamId)
    .maybeSingle();
  if (!team) throw new Error("Team does not exist.");

  // A charge maps to at most one subscription.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("source_transaction_id", input.sourceTransactionId)
    .maybeSingle();
  if (existing) {
    throw new Error("This charge is already mapped to a subscription.");
  }

  // Resolve the card the charge belongs to (so the subscription links to it).
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select("mercury_card_id")
    .eq("mercury_transaction_id", input.sourceTransactionId)
    .maybeSingle();
  if (txErr) throw new Error(`Failed to load charge: ${txErr.message}`);
  if (!tx) throw new Error("Charge not found — capture the statement again.");

  let cardId: string | null = null;
  if (tx.mercury_card_id) {
    const { data: cardRow } = await supabase
      .from("cards")
      .select("id")
      .eq("mercury_card_id", tx.mercury_card_id)
      .maybeSingle();
    cardId = cardRow?.id ?? null;
  }

  const { error: insertErr } = await supabase.from("subscriptions").insert({
    platform,
    product: input.product?.trim() || null,
    amount: Math.round(input.amount * 100) / 100,
    currency,
    billing_cycle: input.billingCycle,
    next_renewal_date: input.nextRenewalDate,
    card_id: cardId,
    team_id: input.teamId,
    tag,
    notes: "Captured from bank statement",
    source_transaction_id: input.sourceTransactionId,
  });
  if (insertErr) {
    throw new Error(`Failed to create subscription: ${insertErr.message}`);
  }

  revalidatePath("/capture");
  revalidatePath("/subscriptions");
  revalidatePath("/");
}

export async function setCaptureEnabled(enabled: boolean): Promise<void> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ id: true, capture_enabled: enabled }, { onConflict: "id" });
  if (error) {
    throw new Error(`Failed to update capture setting: ${error.message}`);
  }
  revalidatePath("/capture");
}
