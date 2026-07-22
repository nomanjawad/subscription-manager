// m14-reports — builds the monthly spending report data from active
// subscriptions (subscription_overview). Yearly plans are normalized to a
// monthly figure. Totals are grouped by currency (never summed across
// currencies). Service client only (RLS deny-all).
import { createServiceClient } from "@/lib/supabase/server";
import type { SubscriptionOverviewRow } from "@/lib/types";

export interface CurrencyTotal {
  currency: string;
  monthly: number;
}

export interface ReportGroup {
  label: string;
  count: number;
  totals: CurrencyTotal[];
}

export interface ReportData {
  scope: "all" | "team";
  teamName: string | null;
  subscriptionCount: number;
  grandTotals: CurrencyTotal[];
  byTeam: ReportGroup[];
  byPlatform: ReportGroup[];
  byCard: ReportGroup[];
}

/** Monthly-normalized cost of one subscription. */
function monthlyOf(row: SubscriptionOverviewRow): number {
  const amount = Number(row.amount) || 0;
  return row.billing_cycle === "yearly" ? amount / 12 : amount;
}

function cardLabel(row: SubscriptionOverviewRow): string {
  if (row.card_nickname) return row.card_nickname;
  if (row.card_last4) return `•••• ${row.card_last4}`;
  return "No card";
}

/** Accumulate a subscription's monthly cost into a keyed group map. */
function accumulate(
  groups: Map<string, Map<string, number>>,
  key: string,
  currency: string,
  monthly: number,
): void {
  if (!groups.has(key)) groups.set(key, new Map());
  const byCcy = groups.get(key)!;
  byCcy.set(currency, (byCcy.get(currency) ?? 0) + monthly);
}

function toGroups(groups: Map<string, Map<string, number>>): ReportGroup[] {
  return Array.from(groups.entries())
    .map(([label, byCcy]) => ({
      label,
      count: 0, // filled by caller alongside a parallel count map
      totals: currencyTotals(byCcy),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function currencyTotals(byCcy: Map<string, number>): CurrencyTotal[] {
  return Array.from(byCcy.entries())
    .map(([currency, monthly]) => ({ currency, monthly }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * Assemble the report. Admin scope (no teamId) covers every team + card;
 * a teamId scopes it to that team's active subscriptions.
 */
export async function getSpendReport(teamId?: string): Promise<ReportData> {
  const supabase = createServiceClient();
  let query = supabase
    .from("subscription_overview")
    .select(
      "platform, product, amount, currency, billing_cycle, team_id, team_name, card_nickname, card_last4",
    )
    .eq("status", "active");
  if (teamId) query = query.eq("team_id", teamId);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to build spend report: ${error.message}`);
  }
  const rows = (data ?? []) as SubscriptionOverviewRow[];

  const teamGroups = new Map<string, Map<string, number>>();
  const platformGroups = new Map<string, Map<string, number>>();
  const cardGroups = new Map<string, Map<string, number>>();
  const teamCounts = new Map<string, number>();
  const platformCounts = new Map<string, number>();
  const cardCounts = new Map<string, number>();
  const grand = new Map<string, number>();

  let teamName: string | null = null;

  for (const row of rows) {
    const currency = row.currency || "USD";
    const monthly = monthlyOf(row);
    const team = row.team_name ?? "Unassigned";
    const platform = row.platform || "—";
    const card = cardLabel(row);

    accumulate(teamGroups, team, currency, monthly);
    accumulate(platformGroups, platform, currency, monthly);
    accumulate(cardGroups, card, currency, monthly);
    teamCounts.set(team, (teamCounts.get(team) ?? 0) + 1);
    platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
    cardCounts.set(card, (cardCounts.get(card) ?? 0) + 1);
    grand.set(currency, (grand.get(currency) ?? 0) + monthly);

    if (teamId) teamName = row.team_name ?? "Unassigned";
  }

  const withCounts = (
    groups: ReportGroup[],
    counts: Map<string, number>,
  ): ReportGroup[] =>
    groups.map((g) => ({ ...g, count: counts.get(g.label) ?? 0 }));

  return {
    scope: teamId ? "team" : "all",
    teamName,
    subscriptionCount: rows.length,
    grandTotals: currencyTotals(grand),
    byTeam: teamId ? [] : withCounts(toGroups(teamGroups), teamCounts),
    byPlatform: withCounts(toGroups(platformGroups), platformCounts),
    byCard: withCounts(toGroups(cardGroups), cardCounts),
  };
}
