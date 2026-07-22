// m14-reports — orchestrates sending the monthly spend report. Admins receive a
// company-wide report (all teams + cards); each team lead receives one scoped to
// their team. Best-effort per recipient (sendRawEmail never throws). Invoked by
// the cron route and by the admin "Send now" action.
import { createServiceClient } from "@/lib/supabase/server";
import { sendRawEmail } from "@/lib/email/send";
import { allAdminEmails } from "@/lib/email/recipients";
import { getSpendReport } from "./queries";
import { buildReportHtml, buildReportSubject } from "./report";

export interface ReportRunResult {
  adminRecipients: number;
  leadReports: number;
}

export async function sendMonthlyReports(): Promise<ReportRunResult> {
  const now = new Date();
  const period = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const generatedAt = now.toISOString().slice(0, 10);

  // ── Admins: one company-wide report to all of them ──────────────────────
  let adminRecipients = 0;
  const admins = await allAdminEmails();
  if (admins.length > 0) {
    const data = await getSpendReport();
    await sendRawEmail(
      admins,
      buildReportSubject(data, period),
      buildReportHtml(data, period, generatedAt),
    );
    adminRecipients = admins.length;
  }

  // ── Team leads: each gets their own team's report ───────────────────────
  const supabase = createServiceClient();
  const { data: leadRows } = await supabase
    .from("profiles")
    .select("email, team_id")
    .eq("role", "team_lead")
    .not("team_id", "is", null);

  const leads = (leadRows ?? []) as { email: string; team_id: string }[];
  let leadReports = 0;
  for (const lead of leads) {
    if (!lead.email || !lead.team_id) continue;
    const data = await getSpendReport(lead.team_id);
    await sendRawEmail(
      lead.email,
      buildReportSubject(data, period),
      buildReportHtml(data, period, generatedAt),
    );
    leadReports += 1;
  }

  return { adminRecipients, leadReports };
}
