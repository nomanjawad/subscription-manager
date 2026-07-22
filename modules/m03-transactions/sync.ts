// m03-transactions — Mercury transaction sync (no UI).
// Pulls recent transactions from every Mercury account and upserts them into
// the `transactions` table keyed on mercury_transaction_id.

import { listAllTransactions, type MercuryTransaction } from "@/lib/mercury";
import { createServiceClient } from "@/lib/supabase/server";

/** Default sync window: 120 days back from today (ISO date, YYYY-MM-DD). */
function defaultStart(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 120);
  return d.toISOString().slice(0, 10);
}

/** Sandbox payloads carry the card id under either `id` or `cardId`. */
export function extractCardId(tx: MercuryTransaction): string | null {
  return (
    tx.details?.creditCardInfo?.id ??
    tx.details?.creditCardInfo?.cardId ??
    tx.details?.debitCardInfo?.id ??
    tx.details?.debitCardInfo?.cardId ??
    null
  );
}

/** Upsert a batch of Mercury transactions into the `transactions` table (keyed
 *  on mercury_transaction_id). Shared by the periodic sync and the Capture
 *  tool. Returns how many rows were written. */
export async function upsertTransactions(
  transactions: MercuryTransaction[],
): Promise<{ upserted: number }> {
  if (transactions.length === 0) {
    return { upserted: 0 };
  }

  const syncedAt = new Date().toISOString();

  // Dedupe by mercury id — Postgres rejects a single upsert batch that
  // touches the same conflict key twice.
  const byId = new Map<string, MercuryTransaction>();
  for (const tx of transactions) {
    byId.set(tx.id, tx);
  }

  const rows = Array.from(byId.values()).map((tx) => ({
    mercury_transaction_id: tx.id,
    mercury_account_id: tx.accountId,
    amount: tx.amount,
    status: tx.status,
    kind: tx.kind,
    counterparty_name: tx.counterpartyName,
    bank_description: tx.bankDescription,
    mercury_card_id: extractCardId(tx),
    posted_at: tx.postedAt,
    created_at_mercury: tx.createdAt,
    failed_at: tx.failedAt,
    reason_for_failure: tx.reasonForFailure,
    raw: tx,
    synced_at: syncedAt,
  }));

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("transactions")
    .upsert(rows, { onConflict: "mercury_transaction_id" });

  if (error) {
    throw new Error(`Transaction upsert failed: ${error.message}`);
  }

  return { upserted: rows.length };
}

export async function syncTransactions(opts?: {
  start?: string;
}): Promise<{ upserted: number }> {
  const start = opts?.start ?? defaultStart();
  const transactions = await listAllTransactions({ start });
  return upsertTransactions(transactions);
}
