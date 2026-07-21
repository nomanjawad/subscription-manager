"use server";

// m05-review — server actions for the review queue.
import { revalidatePath } from "next/cache";
import { getSessionUser, requireAdmin } from "@/lib/supabase/auth";
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

/**
 * Authorize a per-check action: admins always pass; a team lead may only act
 * on a check whose subscription belongs to their own team. Throws otherwise.
 */
async function authorizeCheckAction(
  supabase: ReturnType<typeof createServiceClient>,
  checkId: string,
): Promise<void> {
  const session = await getSessionUser();
  if (!session) {
    throw new Error("You must be signed in to review renewals.");
  }
  if (session.role === "admin") return;

  // team_lead: the check's subscription must belong to their team.
  const { data, error } = await supabase
    .from("renewal_checks")
    .select("subscriptions(team_id)")
    .eq("id", checkId)
    .single();
  assertNoError(error, "authorizing check");

  // PostgREST types a to-one embed as an array in the generated shape; at
  // runtime it's a single object. Normalize both.
  type EmbeddedSub = { team_id: string | null };
  const joined = (
    data as unknown as { subscriptions: EmbeddedSub | EmbeddedSub[] | null }
  ).subscriptions;
  const sub = Array.isArray(joined) ? (joined[0] ?? null) : joined;
  const checkTeamId = sub?.team_id ?? null;

  if (session.teamId === null || checkTeamId !== session.teamId) {
    throw new Error("You may only act on your own team's review items.");
  }
}

/** Run the full sync → generate → match pipeline, then refresh the UI. */
export async function runChecksAction(): Promise<RunRenewalChecksResult> {
  // Global job — admin only. Team leads must not trigger it.
  await requireAdmin();
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
  await authorizeCheckAction(supabase, checkId);

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
  await authorizeCheckAction(supabase, checkId);
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
