// m06-dashboard data access — RPC calls only (no table reads, no JS aggregation).
// Contract: dashboard_totals / upcoming_renewals / spend_by_platform in
// supabase/migrations/20260716075435_initial_schema.sql.
import { createServiceClient } from "@/lib/supabase/server";
import type {
  DashboardTotalsRow,
  SpendByPlatformRow,
  UpcomingRenewalRow,
} from "@/lib/types";

/**
 * Dashboard aggregates in one round trip.
 * Returns null when the database is unreachable / not migrated yet — the RPC
 * itself always yields exactly one row.
 */
export async function getDashboardTotals(
  teamId?: string,
): Promise<DashboardTotalsRow | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc(
      "dashboard_totals",
      teamId ? { p_team_id: teamId } : {},
    );
    if (error) {
      console.error("[m06-dashboard] dashboard_totals failed:", error.message);
      return null;
    }
    // A `returns table` RPC comes back as an array — this one is single-row.
    const rows = (data ?? []) as DashboardTotalsRow[];
    return rows[0] ?? null;
  } catch (err) {
    console.error("[m06-dashboard] dashboard_totals unavailable:", err);
    return null;
  }
}

/** Active subscriptions renewing within the next `days` days (includes overdue). */
export async function getUpcomingRenewals(
  days = 30,
  teamId?: string,
): Promise<UpcomingRenewalRow[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc(
      "upcoming_renewals",
      teamId
        ? { days_ahead: days, p_team_id: teamId }
        : { days_ahead: days },
    );
    if (error) {
      console.error("[m06-dashboard] upcoming_renewals failed:", error.message);
      return [];
    }
    return (data ?? []) as UpcomingRenewalRow[];
  } catch (err) {
    console.error("[m06-dashboard] upcoming_renewals unavailable:", err);
    return [];
  }
}

/** Per-platform spend, normalized to a monthly amount, highest first. */
export async function getSpendByPlatform(
  teamId?: string,
): Promise<SpendByPlatformRow[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc(
      "spend_by_platform",
      teamId ? { p_team_id: teamId } : {},
    );
    if (error) {
      console.error("[m06-dashboard] spend_by_platform failed:", error.message);
      return [];
    }
    return (data ?? []) as SpendByPlatformRow[];
  } catch (err) {
    console.error("[m06-dashboard] spend_by_platform unavailable:", err);
    return [];
  }
}
