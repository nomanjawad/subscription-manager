// m04-matching — PURE renewal-matching engine.
// No DB, no fetch, no env. The cron orchestrator (m03 sync + this engine)
// feeds it plain data and persists the outcome.

export interface EngineTransaction {
  id: string; // DB uuid of transactions row
  amount: number; // negative = money out
  status: string; // pending | sent | failed | ...
  mercuryCardId: string | null;
  postedAt: string | null; // ISO
  createdAt: string | null; // ISO fallback when postedAt null
  counterpartyName: string | null;
  bankDescription: string | null;
  reasonForFailure: string | null;
}

export interface EngineCheck {
  id: string;
  expectedDate: string; // YYYY-MM-DD
  expectedAmount: number; // positive
}

export interface EngineSubscription {
  mercuryCardId: string | null; // card the subscription is registered to
  aliases: string[]; // learned descriptor patterns (may be empty)
}

export type MatchOutcome =
  | { kind: "renewed"; transactionId: string }
  | { kind: "failed"; transactionId: string; reason: string }
  | { kind: "no_match" };

const MS_PER_DAY = 86_400_000;
const DATE_WINDOW_DAYS = 3;
const AMOUNT_TOLERANCE = 0.05; // ±5%
const EPSILON = 1e-9; // guard float noise at exact boundaries

/** UTC midnight (ms) for the calendar date of an ISO date/timestamp. */
function dayUtc(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function containsAlias(tx: EngineTransaction, aliases: string[]): boolean {
  const haystacks = [tx.counterpartyName, tx.bankDescription]
    .filter((s): s is string => s !== null)
    .map((s) => s.toLowerCase());
  return aliases.some((alias) => {
    const needle = alias.toLowerCase();
    return haystacks.some((h) => h.includes(needle));
  });
}

interface Candidate {
  tx: EngineTransaction;
  amountDiff: number;
  dateDiffDays: number;
}

export function matchRenewal(
  check: EngineCheck,
  subscription: EngineSubscription,
  transactions: EngineTransaction[],
): MatchOutcome {
  const expectedDay = dayUtc(check.expectedDate);
  if (expectedDay === null) return { kind: "no_match" };

  const candidates: Candidate[] = [];

  for (const tx of transactions) {
    // Money-out only — credits never match.
    if (tx.amount >= 0) continue;

    // Effective date within ±3 days of the expected date.
    const effectiveIso = tx.postedAt ?? tx.createdAt;
    if (effectiveIso === null) continue;
    const txDay = dayUtc(effectiveIso);
    if (txDay === null) continue;
    const dateDiffDays = Math.abs(txDay - expectedDay) / MS_PER_DAY;
    if (dateDiffDays > DATE_WINDOW_DAYS) continue;

    // Amount within ±5% of the expected amount.
    const amountDiff = Math.abs(Math.abs(tx.amount) - check.expectedAmount);
    if (amountDiff > check.expectedAmount * AMOUNT_TOLERANCE + EPSILON) continue;

    // Card rule: both known → must be the same card. Either unknown → skip
    // the card check and rely on descriptor/amount evidence.
    const cardKnownBoth =
      subscription.mercuryCardId !== null && tx.mercuryCardId !== null;
    if (cardKnownBoth && subscription.mercuryCardId !== tx.mercuryCardId) {
      continue;
    }
    const cardMatched = cardKnownBoth; // both non-null and equal at this point

    // Alias rule: with aliases, the descriptor must contain one. Without
    // aliases, only a real card match is enough evidence.
    if (subscription.aliases.length > 0) {
      if (!containsAlias(tx, subscription.aliases)) continue;
    } else if (!cardMatched) {
      continue; // not enough evidence — goes to review
    }

    candidates.push({ tx, amountDiff, dateDiffDays });
  }

  if (candidates.length === 0) return { kind: "no_match" };

  // Closest amount wins; tie-break on date closest to expected.
  candidates.sort(
    (a, b) => a.amountDiff - b.amountDiff || a.dateDiffDays - b.dateDiffDays,
  );
  const best = candidates[0].tx;

  if (best.status === "sent" || best.status === "pending") {
    return { kind: "renewed", transactionId: best.id };
  }
  if (best.status === "failed") {
    return {
      kind: "failed",
      transactionId: best.id,
      reason: best.reasonForFailure ?? "charge failed",
    };
  }
  // cancelled / reversed / blocked / anything else → treat like a failure.
  return { kind: "failed", transactionId: best.id, reason: best.status };
}

/** Map a DB transactions row to the engine's input shape. */
export function toEngineTransaction(
  row: import("@/lib/types").TransactionRow,
): EngineTransaction {
  return {
    id: row.id,
    amount: row.amount,
    status: row.status,
    mercuryCardId: row.mercury_card_id,
    postedAt: row.posted_at,
    createdAt: row.created_at_mercury,
    counterpartyName: row.counterparty_name,
    bankDescription: row.bank_description,
    reasonForFailure: row.reason_for_failure,
  };
}
