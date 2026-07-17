// POST /api/sync/transactions — pull recent Mercury transactions into the DB.
// Thin handler; all logic lives in modules/m03-transactions/sync.ts.

import { NextResponse } from "next/server";
import { syncTransactions } from "@/modules/m03-transactions/sync";

export async function POST(): Promise<NextResponse> {
  try {
    const { upserted } = await syncTransactions();
    return NextResponse.json({ ok: true, upserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
