// Dev/demo-only seeding: creates subscriptions that line up with real sandbox
// transactions so the matching engine visibly produces all three outcomes
// (renewed / failed / needs review) during the company demo.
// Re-runnable: previous demo rows (notes = 'demo-seed') are removed first.
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncCards } from "@/modules/m01-cards/sync";
import { syncTransactions } from "@/modules/m03-transactions/sync";
import type { TransactionRow } from "@/lib/types";

const DEMO_TAG = "demo-seed";

function effectiveDate(t: TransactionRow): string | null {
  const iso = t.posted_at ?? t.created_at_mercury;
  return iso ? iso.slice(0, 10) : null;
}

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "disabled in production" }, { status: 403 });
  }

  try {
    const cards = await syncCards();
    const txs = await syncTransactions();
    const sb = createServiceClient();

    // Clear previous demo rows (renewal_checks / aliases cascade)
    await sb.from("subscriptions").delete().eq("notes", DEMO_TAG);

    const { data: txRows, error: txErr } = await sb
      .from("transactions")
      .select("*")
      .lt("amount", 0)
      .order("synced_at", { ascending: false })
      .limit(200);
    if (txErr) throw new Error(txErr.message);

    const candidates = (txRows ?? []) as TransactionRow[];
    const okStatuses = new Set(["sent", "pending"]);

    const matchedTx =
      candidates.find((t) => okStatuses.has(t.status) && t.mercury_card_id && effectiveDate(t)) ??
      candidates.find((t) => okStatuses.has(t.status) && effectiveDate(t)) ??
      null;
    const failedTx =
      candidates.find(
        (t) =>
          !okStatuses.has(t.status) &&
          effectiveDate(t) &&
          t.counterparty_name !== matchedTx?.counterparty_name,
      ) ?? null;

    const created: Array<{ platform: string; scenario: string }> = [];

    async function insertSub(
      row: Record<string, unknown>,
      aliasFrom: TransactionRow | null,
      scenario: string,
    ) {
      const { data, error } = await sb
        .from("subscriptions")
        .insert({ ...row, notes: DEMO_TAG })
        .select("id")
        .single();
      if (error) throw new Error(`${scenario}: ${error.message}`);
      // If the subscription couldn't be tied to a card, teach it the vendor's
      // descriptor so the engine has enough evidence to auto-match.
      if (aliasFrom?.counterparty_name && !row.card_id) {
        await sb.from("merchant_aliases").insert({
          subscription_id: data.id,
          descriptor_pattern: aliasFrom.counterparty_name,
          learned_from_transaction_id: aliasFrom.id,
        });
      }
      created.push({ platform: String(row.platform), scenario });
    }

    async function cardIdFor(mercuryCardId: string | null): Promise<string | null> {
      if (!mercuryCardId) return null;
      const { data } = await sb
        .from("cards")
        .select("id")
        .eq("mercury_card_id", mercuryCardId)
        .maybeSingle();
      return data?.id ?? null;
    }

    if (matchedTx) {
      await insertSub(
        {
          platform: matchedTx.counterparty_name ?? "Sandbox Vendor",
          product: "Auto-verifies against a real sandbox charge",
          amount: Math.abs(Number(matchedTx.amount)),
          currency: "USD",
          billing_cycle: "monthly",
          next_renewal_date: effectiveDate(matchedTx),
          card_id: await cardIdFor(matchedTx.mercury_card_id),
        },
        matchedTx,
        "renewed (auto-match)",
      );
    }

    if (failedTx) {
      await insertSub(
        {
          platform: failedTx.counterparty_name ?? "Failing Vendor",
          product: `Matches a ${failedTx.status} sandbox charge`,
          amount: Math.abs(Number(failedTx.amount)),
          currency: "USD",
          billing_cycle: "monthly",
          next_renewal_date: effectiveDate(failedTx),
          card_id: await cardIdFor(failedTx.mercury_card_id),
        },
        failedTx,
        `failed (${failedTx.status})`,
      );
    }

    // Always present: a renewal with no matching charge → lands in review
    await insertSub(
      {
        platform: "Acme Cloud",
        product: "Team plan — no matching charge exists",
        amount: 123.45,
        currency: "USD",
        billing_cycle: "monthly",
        next_renewal_date: isoDaysFromToday(-2),
        card_id: null,
      },
      null,
      "needs_review (no match)",
    );

    // Upcoming renewals for the dashboard (not part of matching)
    await insertSub(
      {
        platform: "Figma",
        product: "Professional, 5 seats",
        amount: 75,
        currency: "USD",
        billing_cycle: "monthly",
        next_renewal_date: isoDaysFromToday(12),
        card_id: null,
      },
      null,
      "upcoming (dashboard)",
    );
    await insertSub(
      {
        platform: "GitHub",
        product: "Team",
        amount: 48,
        currency: "USD",
        billing_cycle: "monthly",
        next_renewal_date: isoDaysFromToday(24),
        card_id: null,
      },
      null,
      "upcoming (dashboard)",
    );

    return NextResponse.json({
      ok: true,
      cardsSynced: cards.synced,
      transactionsUpserted: txs.upserted,
      sandboxHadCardTx: Boolean(matchedTx?.mercury_card_id),
      sandboxHadFailedTx: Boolean(failedTx),
      created,
      next: "POST /api/cron/check-renewals (or the Run checks button on /review)",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
