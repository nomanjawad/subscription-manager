// Cron endpoint: sync transactions → generate checks → run matching.
// Orchestrates m03 + m04 via the m05 runner. Wired to a daily schedule in
// vercel.json. Vercel Cron invokes it with GET (and injects the CRON_SECRET as
// a Bearer header); POST is also accepted for manual/other schedulers.
import { NextResponse } from "next/server";
import { runRenewalChecks } from "@/modules/m05-review/runner";

async function handle(request: Request): Promise<NextResponse> {
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

export const GET = handle;
export const POST = handle;
