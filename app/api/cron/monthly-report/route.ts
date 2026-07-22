// Cron endpoint: email the monthly subscription-spend report to admins (all
// teams) and each team lead (their team). Point a monthly scheduler at this
// (e.g. the 1st of each month). Protected by CRON_SECRET when set.
import { NextResponse } from "next/server";
import { sendMonthlyReports } from "@/modules/m14-reports/runner";

export async function POST(request: Request): Promise<NextResponse> {
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
