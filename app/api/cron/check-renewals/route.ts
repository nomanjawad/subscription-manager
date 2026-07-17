// Cron endpoint: sync transactions → generate checks → run matching.
// Orchestrates m03 + m04 via the m05 runner. Protected by CRON_SECRET when set.
import { NextResponse } from "next/server";
import { runRenewalChecks } from "@/modules/m05-review/runner";

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const counters = await runRenewalChecks();
    return NextResponse.json({ ok: true, ...counters });
  } catch (error) {
    const message = error instanceof Error ? error.message : "renewal check run failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
