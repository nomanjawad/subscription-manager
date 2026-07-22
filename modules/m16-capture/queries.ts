// m16-capture — read side of the statement-capture onboarding tool. Reads the
// `transactions` table (already populated by a capture pull) for one card + one
// month, and flags which charges have already been mapped to a subscription
// (via subscriptions.source_transaction_id). Service client only (RLS deny-all).
import { createServiceClient } from "@/lib/supabase/server";

export type CapturePeriod = "this" | "last";

export interface CaptureMonth {
  start: string; // inclusive YYYY-MM-DD
  end: string; // exclusive YYYY-MM-DD (first of next month)
  label: string; // e.g. "July 2026"
}

/** The [start, end) date window + label for "this" or "last" calendar month. */
export function monthRange(period: CapturePeriod): CaptureMonth {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const base =
    period === "last"
      ? new Date(Date.UTC(y, m - 1, 1))
      : new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1));
  return {
    start: base.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: base.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

export interface CapturedCharge {
  transactionId: string;
  amount: number; // positive (money out)
  counterparty: string | null;
  description: string | null;
  postedAt: string | null;
  mappedSubscriptionId: string | null;
  mappedPlatform: string | null;
}

/** Whether the Capture feature is on (defaults on when unset). */
export async function getCaptureEnabled(): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("app_settings")
    .select("capture_enabled")
    .maybeSingle();
  return (data as { capture_enabled: boolean } | null)?.capture_enabled ?? true;
}

/** Money-out charges for a card within a month, with mapped-subscription flags. */
export async function getCapturedCharges(
  mercuryCardId: string,
  start: string,
  end: string,
): Promise<CapturedCharge[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("mercury_transaction_id, amount, counterparty_name, bank_description, posted_at")
    .eq("mercury_card_id", mercuryCardId)
    .lt("amount", 0) // money out
    .gte("posted_at", start)
    .lt("posted_at", end)
    .order("posted_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to load captured charges: ${error.message}`);
  }
  const rows = (data ?? []) as {
    mercury_transaction_id: string;
    amount: number;
    counterparty_name: string | null;
    bank_description: string | null;
    posted_at: string | null;
  }[];

  // Which of these transactions already became a subscription?
  const ids = rows.map((r) => r.mercury_transaction_id);
  const mapped = new Map<string, { id: string; platform: string }>();
  if (ids.length > 0) {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id, platform, source_transaction_id")
      .in("source_transaction_id", ids);
    for (const s of (subs ?? []) as {
      id: string;
      platform: string;
      source_transaction_id: string;
    }[]) {
      mapped.set(s.source_transaction_id, { id: s.id, platform: s.platform });
    }
  }

  return rows.map((r) => {
    const m = mapped.get(r.mercury_transaction_id);
    return {
      transactionId: r.mercury_transaction_id,
      amount: Math.abs(Number(r.amount) || 0),
      counterparty: r.counterparty_name,
      description: r.bank_description,
      postedAt: r.posted_at,
      mappedSubscriptionId: m?.id ?? null,
      mappedPlatform: m?.platform ?? null,
    };
  });
}
