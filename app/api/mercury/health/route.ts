import { NextResponse } from "next/server";
import { listAccounts } from "@/lib/mercury";

export async function GET() {
  try {
    const accounts = await listAccounts();
    return NextResponse.json({
      ok: true,
      environment: process.env.MERCURY_API_URL?.includes("sandbox")
        ? "sandbox"
        : "production",
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        balance: a.availableBalance,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
