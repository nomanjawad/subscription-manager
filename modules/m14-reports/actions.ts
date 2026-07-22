"use server";

// m14-reports — admin action to send the monthly report on demand (the "Send
// now" button on the Users page). Admin only; delegates to the same runner the
// cron uses so the manual + scheduled paths are identical.
import { requireAdmin } from "@/lib/supabase/auth";
import { sendMonthlyReports, type ReportRunResult } from "./runner";

export async function sendMonthlyReportNow(): Promise<ReportRunResult> {
  await requireAdmin();
  return sendMonthlyReports();
}
