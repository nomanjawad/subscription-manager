// Cron endpoint: email the monthly subscription-spend report to admins (all
// teams) and each team lead (their team). Wired to a monthly schedule in
// vercel.json. Vercel Cron invokes it with GET (and injects the CRON_SECRET as
// a Bearer header); POST is also accepted for manual/other schedulers.
import { NextResponse } from "next/server";
import { sendMonthlyReports } from "@/modules/m14-reports/runner";

async function handle(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendMonthlyReports();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "monthly report run failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
