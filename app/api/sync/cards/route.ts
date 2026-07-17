// Thin route — delegates to m01-cards.
import { NextResponse } from "next/server";
import { syncCards } from "@/modules/m01-cards/sync";

export async function POST() {
  try {
    const { synced } = await syncCards();
    return NextResponse.json({ ok: true, synced });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Card sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
