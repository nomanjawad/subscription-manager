// m02-subscriptions — subscription report builders (CSV + XLSX). Pure over
// the already-filtered rows; the export route handles auth, scope, filtering.
import ExcelJS from "exceljs";
import type { CheckStatus, SubscriptionOverviewRow } from "@/lib/types";

type Cell = string | number | null;

interface Column {
  header: string;
  width: number;
  value: (row: SubscriptionOverviewRow) => Cell;
  numFmt?: string;
}

const CHECK_LABEL: Record<CheckStatus, string> = {
  pending: "Check pending",
  renewed: "Renewed",
  failed: "Check failed",
  needs_review: "Needs review",
};

const COLUMNS: Column[] = [
  { header: "Platform", width: 22, value: (r) => r.platform },
  { header: "Product", width: 22, value: (r) => r.product },
  { header: "Team", width: 18, value: (r) => r.team_name ?? "Unassigned" },
  { header: "Start date", width: 12, value: (r) => r.start_date },
  { header: "Next renewal", width: 13, value: (r) => r.next_renewal_date },
  { header: "Billing cycle", width: 12, value: (r) => r.billing_cycle },
  { header: "Amount", width: 12, value: (r) => Number(r.amount), numFmt: "#,##0.00" },
  { header: "Currency", width: 9, value: (r) => r.currency },
  { header: "Card last 4", width: 11, value: (r) => r.card_last4 },
  { header: "Card name", width: 20, value: (r) => r.card_nickname ?? r.card_name },
  {
    header: "Status",
    width: 22,
    value: (r) =>
      r.status === "active" && r.cancellation_pending
        ? "active (cancellation pending)"
        : r.status,
  },
  {
    header: "Last renewal check",
    width: 18,
    value: (r) => (r.last_check_status ? CHECK_LABEL[r.last_check_status] : null),
  },
  { header: "Tag", width: 14, value: (r) => r.tag },
  { header: "Purchased by", width: 18, value: (r) => r.purchased_by_name },
  { header: "Account email", width: 26, value: (r) => r.account_email },
  { header: "Order number", width: 16, value: (r) => r.order_number },
];

/**
 * Spreadsheet apps execute cells starting with = + - @ (and tab/CR) as
 * formulas — prefix them so user-entered text can't run as one.
 */
function safeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvField(value: Cell): string {
  if (value === null) return "";
  const text = typeof value === "number" ? String(value) : safeText(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function subscriptionsToCsv(rows: SubscriptionOverviewRow[]): string {
  const lines = [
    COLUMNS.map((c) => csvField(c.header)).join(","),
    ...rows.map((row) => COLUMNS.map((c) => csvField(c.value(row))).join(",")),
  ];
  // BOM so Excel opens UTF-8 (non-ASCII platform names) correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export async function subscriptionsToXlsx(
  rows: SubscriptionOverviewRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Subscriptions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map((c) => ({
    header: c.header,
    width: c.width,
    style: c.numFmt ? { numFmt: c.numFmt } : {},
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(
      COLUMNS.map((c) => {
        const v = c.value(row);
        return typeof v === "string" ? safeText(v) : v;
      }),
    );
  }
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
