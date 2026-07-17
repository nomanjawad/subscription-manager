"use server";

// m05-review — server actions for the review queue.
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { RenewalCheckRow, SubscriptionRow } from "@/lib/types";
import { advanceOneCycle } from "./dates";
import { runRenewalChecks, type RunRenewalChecksResult } from "./runner";

function revalidateAll(): void {
  revalidatePath("/review");
  revalidatePath("/");
  revalidatePath("/subscriptions");
}

function assertNoError(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/** Run the full sync → generate → match pipeline, then refresh the UI. */
export async function runChecksAction(): Promise<RunRenewalChecksResult> {
  const result = await runRenewalChecks();
  revalidateAll();
  return result;
}

/**
 * Manually confirm a candidate transaction as the renewal payment.
 * Optionally learns a merchant alias so next cycle auto-matches.
 */
export async function confirmMatch(
  checkId: string,
  transactionId: string,
  learnAlias: string | null,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: checkData, error: checkError } = await supabase
    .from("renewal_checks")
    .select("*")
    .eq("id", checkId)
    .single();
  assertNoError(checkError, "loading check");
  const check = checkData as RenewalCheckRow;

  const { error: updateError } = await supabase
    .from("renewal_checks")
    .update({
      status: "renewed",
      matched_transaction_id: transactionId,
      resolved_at: new Date().toISOString(),
      resolution_note: "manually confirmed",
    })
    .eq("id", checkId);
  assertNoError(updateError, "confirming check");

  const alias = learnAlias?.trim();
  if (alias) {
    const { error: aliasError } = await supabase.from("merchant_aliases").upsert(
      {
        subscription_id: check.subscription_id,
        descriptor_pattern: alias,
        learned_from_transaction_id: transactionId,
      },
      { onConflict: "subscription_id,descriptor_pattern", ignoreDuplicates: true },
    );
    assertNoError(aliasError, "learning merchant alias");
  }

  // Advance the subscription one cycle from expected_date — never rewind.
  const { data: subData, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", check.subscription_id)
    .single();
  assertNoError(subError, "loading subscription");
  const subscription = subData as SubscriptionRow;

  if (subscription.next_renewal_date <= check.expected_date) {
    const { error: advanceError } = await supabase
      .from("subscriptions")
      .update({
        next_renewal_date: advanceOneCycle(check.expected_date, subscription.billing_cycle),
      })
      .eq("id", subscription.id);
    assertNoError(advanceError, "advancing next_renewal_date");
  }

  revalidateAll();
}

/** Manually mark a review item as a failed renewal. */
export async function markFailed(checkId: string, note: string | null): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("renewal_checks")
    .update({
      status: "failed",
      failure_reason: note ?? "manually marked failed",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", checkId);
  assertNoError(error, "marking check failed");
  revalidateAll();
}
