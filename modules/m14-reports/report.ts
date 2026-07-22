// m14-reports — renders ReportData to inline-styled HTML for the monthly email.
// Kept dependency-free (no PDF lib): a clean HTML table renders in every mail
// client and is easy to skim. All figures are monthly-normalized.
import type { CurrencyTotal, ReportData, ReportGroup } from "./queries";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtTotals(totals: CurrencyTotal[]): string {
  if (totals.length === 0) return "—";
  return totals.map((t) => `${t.currency} ${fmtMoney(t.monthly)}`).join(" · ");
}

const TH =
  "text-align:left;padding:8px 10px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.03em";
const TD = "padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:14px";
const TD_R = `${TD};text-align:right;white-space:nowrap`;

function groupTable(title: string, groups: ReportGroup[]): string {
  if (groups.length === 0) return "";
  const rows = groups
    .map(
      (g) =>
        `<tr><td style="${TD}">${escapeHtml(g.label)}</td><td style="${TD_R}">${g.count}</td><td style="${TD_R}">${fmtTotals(g.totals)}</td></tr>`,
    )
    .join("");
  return `
    <h3 style="margin:24px 0 8px;font-size:16px">${escapeHtml(title)}</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${TH}">${escapeHtml(title.replace(/^By /, ""))}</th>
        <th style="${TH};text-align:right">Subs</th>
        <th style="${TH};text-align:right">Monthly</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildReportSubject(data: ReportData, period: string): string {
  const scope = data.scope === "team" ? data.teamName ?? "Your team" : "All teams";
  return `Monthly subscription spend — ${scope} (${period})`;
}

/** period is a human label like "July 2026"; generatedAt is an ISO/pretty date. */
export function buildReportHtml(
  data: ReportData,
  period: string,
  generatedAt: string,
): string {
  const scopeLabel =
    data.scope === "team"
      ? `Team: ${escapeHtml(data.teamName ?? "Your team")}`
      : "All teams & cards";

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5;font-size:14px;max-width:680px">
    <h2 style="margin:0 0 4px">Monthly subscription spend</h2>
    <p style="margin:0 0 4px;color:#6b7280">${scopeLabel} — ${escapeHtml(period)}</p>
    <p style="margin:0 0 16px;color:#6b7280;font-size:12px">Generated ${escapeHtml(generatedAt)}. Amounts are monthly-normalized (yearly plans ÷ 12).</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      <tbody>
        <tr>
          <td style="${TD}"><strong>Active subscriptions</strong></td>
          <td style="${TD_R}"><strong>${data.subscriptionCount}</strong></td>
        </tr>
        <tr>
          <td style="${TD}"><strong>Total monthly spend</strong></td>
          <td style="${TD_R}"><strong>${fmtTotals(data.grandTotals)}</strong></td>
        </tr>
      </tbody>
    </table>

    ${groupTable("By team", data.byTeam)}
    ${groupTable("By platform", data.byPlatform)}
    ${groupTable("By card", data.byCard)}

    ${
      data.subscriptionCount === 0
        ? '<p style="margin-top:16px;color:#6b7280">No active subscriptions in scope.</p>'
        : ""
    }
  </div>`;
}
