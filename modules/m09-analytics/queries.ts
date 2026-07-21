// m09-analytics data access — admin-only, RPC calls only (no table reads, no
// JS aggregation). Contract: spend_by_team / spend_by_card / dashboard_totals.
import { createServiceClient } from "@/lib/supabase/server";
import type {
  DashboardTotalsRow,
  SpendByCardRow,
  SpendByTeamRow,
} from "@/lib/types";

/** Monthly spend per team (includes an "Unassigned" row). Empty on failure. */
export async function getSpendByTeam(): Promise<SpendByTeamRow[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("spend_by_team");
    if (error) {
      console.error("[m09-analytics] spend_by_team failed:", error.message);
      return [];
    }
    return ((data ?? []) as SpendByTeamRow[]).map((r) => ({
      ...r,
      monthly_amount: Number(r.monthly_amount),
      subscription_count: Number(r.subscription_count),
    }));
  } catch (err) {
    console.error("[m09-analytics] spend_by_team unavailable:", err);
    return [];
  }
}

/** Total money-out per Mercury card across ALL synced transactions. */
export async function getSpendByCard(): Promise<SpendByCardRow[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("spend_by_card");
    if (error) {
      console.error("[m09-analytics] spend_by_card failed:", error.message);
      return [];
    }
    return ((data ?? []) as SpendByCardRow[]).map((r) => ({
      ...r,
      total_out: Number(r.total_out),
      transaction_count: Number(r.transaction_count),
    }));
  } catch (err) {
    console.error("[m09-analytics] spend_by_card unavailable:", err);
    return [];
  }
}

/**
 * Overall (all-teams) aggregates in one round trip.
 * Returns null when the database is unreachable / not migrated yet.
 */
export async function getOverallTotals(): Promise<DashboardTotalsRow | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("dashboard_totals");
    if (error) {
      console.error("[m09-analytics] dashboard_totals failed:", error.message);
      return null;
    }
    const rows = (data ?? []) as DashboardTotalsRow[];
    return rows[0] ?? null;
  } catch (err) {
    console.error("[m09-analytics] dashboard_totals unavailable:", err);
    return null;
  }
}
