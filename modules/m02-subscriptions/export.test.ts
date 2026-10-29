import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import type { SubscriptionOverviewRow } from "@/lib/types";
import { subscriptionsToCsv, subscriptionsToXlsx } from "./export";

function row(overrides: Partial<SubscriptionOverviewRow> = {}): SubscriptionOverviewRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    platform: "Figma",
    product: "Professional",
    order_number: null,
    amount: 45,
    currency: "USD",
    billing_cycle: "monthly",
    next_renewal_date: "2026-11-15",
    account_email: "design@example.com",
    status: "active",
    notes: null,
    created_at: "2026-01-15T10:00:00Z",
    card_id: "00000000-0000-0000-0000-000000000002",
    card_nickname: "Design",
    card_name: null,
    card_last4: "4242",
    card_status: "active",
    last_check_status: "renewed",
    last_check_date: "2026-10-15",
    last_check_failure_reason: null,
    tag: null,
    team_id: null,
    team_name: "Design",
    purchased_by: null,
    purchased_by_name: null,
    cancellation_pending: false,
    start_date: "2026-01-15",
    ...overrides,
  };
}

describe("subscriptionsToCsv", () => {
  it("writes a BOM, header and one line per row", () => {
    const csv = subscriptionsToCsv([row(), row({ platform: "Slack" })]);
    expect(csv.startsWith("﻿Platform,Product,")).toBe(true);
    expect(csv.trimEnd().split("\r\n")).toHaveLength(3);
    expect(csv).toContain("Figma,Professional,Design,2026-01-15,2026-11-15,monthly,45,USD,4242,");
  });

  it("quotes commas/quotes and neutralizes formula-looking text", () => {
    const csv = subscriptionsToCsv([
      row({ platform: 'Acme, "Pro"', product: "=HYPERLINK(\"x\")" }),
    ]);
    expect(csv).toContain('"Acme, ""Pro"""');
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe("subscriptionsToXlsx", () => {
  it("produces a workbook with a header row and numeric amounts", async () => {
    const buffer = await subscriptionsToXlsx([row({ amount: 12.5 })]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = wb.getWorksheet("Subscriptions")!;
    expect(sheet.getRow(1).getCell(1).value).toBe("Platform");
    expect(sheet.getRow(2).getCell(7).value).toBe(12.5);
    expect(sheet.getRow(2).getCell(9).value).toBe("4242");
  });
});
