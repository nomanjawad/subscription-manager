// m05-review — renewal check runner. The sanctioned orchestrator that
// composes m03 (transaction sync) and m04 (pure matching engine).
// Direct table access here is limited to this module's own writes plus the
// batched reads the engine needs; UI reads still go through views/RPC.
import { createServiceClient } from "@/lib/supabase/server";
import type {
  MerchantAliasRow,
  RenewalCheckRow,
  SubscriptionRow,
  TransactionRow,
} from "@/lib/types";
import { syncTransactions } from "@/modules/m03-transactions/sync";
import {
  matchRenewal,
  toEngineTransaction,
  type EngineCheck,
  type EngineSubscription,
} from "@/modules/m04-matching/engine";
import { addDaysISO, advanceOneCycle, todayISO } from "./dates";

export interface RunRenewalChecksResult {
  synced: number;
  checksCreated: number;
  renewed: number;
  failed: number;
  needsReview: number;
}

function assertNoError(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function runRenewalChecks(): Promise<RunRenewalChecksResult> {
  const supabase = createServiceClient();
  const today = todayISO();

  // a. Pull fresh transactions from Mercury.
  const { upserted } = await syncTransactions();

  // b. Generate checks for active subscriptions due within 3 days.
  const { data: dueData, error: dueError } = await supabase
    .from("subscriptions")
    .select("id, amount, next_renewal_date")
    .eq("status", "active")
    .lte("next_renewal_date", addDaysISO(today, 3));
  assertNoError(dueError, "loading due subscriptions");
  const dueSubs = (dueData ?? []) as Pick<
    SubscriptionRow,
    "id" | "amount" | "next_renewal_date"
  >[];

  let checksCreated = 0;
  if (dueSubs.length > 0) {
    const { data: insertedData, error: insertError } = await supabase
      .from("renewal_checks")
      .upsert(
        dueSubs.map((s) => ({
          subscription_id: s.id,
          expected_date: s.next_renewal_date,
          expected_amount: s.amount,
          status: "pending" as const,
        })),
        { onConflict: "subscription_id,expected_date", ignoreDuplicates: true },
      )
      .select("id");
    assertNoError(insertError, "creating renewal checks");
    checksCreated = insertedData?.length ?? 0;
  }

  // c. Load all open checks (pending + needs_review) and their context.
  const { data: checksData, error: checksError } = await supabase
    .from("renewal_checks")
    .select("*")
    .in("status", ["pending", "needs_review"]);
  assertNoError(checksError, "loading open checks");
  const checks = (checksData ?? []) as RenewalCheckRow[];

  if (checks.length === 0) {
    return { synced: upserted, checksCreated, renewed: 0, failed: 0, needsReview: 0 };
  }

  const subscriptionIds = [...new Set(checks.map((c) => c.subscription_id))];
  const { data: subsData, error: subsError } = await supabase
    .from("subscriptions")
    .select("*")
    .in("id", subscriptionIds);
  assertNoError(subsError, "loading subscriptions for checks");
  const subscriptions = (subsData ?? []) as SubscriptionRow[];
  const subscriptionById = new Map(subscriptions.map((s) => [s.id, s]));

  // Cards → mercury_card_id (second query, batched).
  const cardIds = [
    ...new Set(
      subscriptions
        .map((s) => s.card_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  const mercuryCardIdByCardId = new Map<string, string>();
  if (cardIds.length > 0) {
    const { data: cardsData, error: cardsError } = await supabase
      .from("cards")
      .select("id, mercury_card_id")
      .in("id", cardIds);
    assertNoError(cardsError, "loading cards for checks");
    for (const card of (cardsData ?? []) as { id: string; mercury_card_id: string }[]) {
      mercuryCardIdByCardId.set(card.id, card.mercury_card_id);
    }
  }

  // Merchant aliases for all involved subscriptions in one query, grouped in JS.
  const { data: aliasData, error: aliasError } = await supabase
    .from("merchant_aliases")
    .select("subscription_id, descriptor_pattern")
    .in("subscription_id", subscriptionIds);
  assertNoError(aliasError, "loading merchant aliases");
  const aliasesBySubscription = new Map<string, string[]>();
  for (const alias of (aliasData ?? []) as Pick<
    MerchantAliasRow,
    "subscription_id" | "descriptor_pattern"
  >[]) {
    const list = aliasesBySubscription.get(alias.subscription_id) ?? [];
    list.push(alias.descriptor_pattern);
    aliasesBySubscription.set(alias.subscription_id, list);
  }

  // d. Load transactions in the relevant window once.
  const expectedDates = checks.map((c) => c.expected_date).sort();
  const windowStart = addDaysISO(expectedDates[0], -10);
  const windowEndExclusive = addDaysISO(expectedDates[expectedDates.length - 1], 11);
  const { data: txData, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .or(
      `and(posted_at.gte.${windowStart},posted_at.lt.${windowEndExclusive}),` +
        `and(created_at_mercury.gte.${windowStart},created_at_mercury.lt.${windowEndExclusive})`,
    );
  assertNoError(txError, "loading transactions window");
  const engineTransactions = ((txData ?? []) as TransactionRow[]).map(
    toEngineTransaction,
  );

  // e. Run the matching engine over every open check.
  let renewed = 0;
  let failed = 0;
  let needsReview = 0;
  const graceCutoff = addDaysISO(today, -1);

  for (const check of checks) {
    const subscription = subscriptionById.get(check.subscription_id);
    if (!subscription) continue;

    const engineCheck: EngineCheck = {
      id: check.id,
      expectedDate: check.expected_date,
      expectedAmount: Number(check.expected_amount),
    };
    const engineSubscription: EngineSubscription = {
      mercuryCardId: subscription.card_id
        ? (mercuryCardIdByCardId.get(subscription.card_id) ?? null)
        : null,
      aliases: aliasesBySubscription.get(subscription.id) ?? [],
    };

    const outcome = matchRenewal(engineCheck, engineSubscription, engineTransactions);
    const nowISO = new Date().toISOString();

    if (outcome.kind === "renewed") {
      const { error } = await supabase
        .from("renewal_checks")
        .update({
          status: "renewed",
          matched_transaction_id: outcome.transactionId,
          resolved_at: nowISO,
        })
        .eq("id", check.id);
      assertNoError(error, "marking check renewed");
      renewed += 1;

      // Advance the subscription one cycle from expected_date — never rewind.
      if (subscription.next_renewal_date <= check.expected_date) {
        const nextDate = advanceOneCycle(check.expected_date, subscription.billing_cycle);
        const { error: advanceError } = await supabase
          .from("subscriptions")
          .update({ next_renewal_date: nextDate })
          .eq("id", subscription.id);
        assertNoError(advanceError, "advancing next_renewal_date");
        subscription.next_renewal_date = nextDate; // keep in-memory copy current
      }
    } else if (outcome.kind === "failed") {
      const { error } = await supabase
        .from("renewal_checks")
        .update({
          status: "failed",
          matched_transaction_id: outcome.transactionId,
          failure_reason: outcome.reason,
          resolved_at: nowISO,
        })
        .eq("id", check.id);
      assertNoError(error, "marking check failed");
      failed += 1;
    } else {
      // no_match
      if (check.status === "pending" && check.expected_date <= graceCutoff) {
        const { error } = await supabase
          .from("renewal_checks")
          .update({ status: "needs_review" })
          .eq("id", check.id);
        assertNoError(error, "marking check needs_review");
        needsReview += 1;
      } else if (check.status === "needs_review") {
        needsReview += 1; // still unresolved
      }
      // pending with a future expected_date: leave as-is.
    }
  }

  return { synced: upserted, checksCreated, renewed, failed, needsReview };
}
