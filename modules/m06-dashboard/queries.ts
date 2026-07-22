// m06-dashboard data access — RPC calls only (no table reads, no JS aggregation).
// Contract: dashboard_totals / upcoming_renewals / spend_by_platform in
// supabase/migrations/20260716075435_initial_schema.sql; spend_by_team /
// spend_by_card / spend_by_month for the admin charts.
import { createServiceClient } from "@/lib/supabase/server";
import type {
  DashboardTotalsRow,
  SpendByCardRow,
  SpendByMonthRow,
  SpendByPlatformRow,
  SpendByTeamActualRow,
  SpendByTeamRow,
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

// ── Admin charts (all-teams) ────────────────────────────────────────────────

/** Monthly spend per team, normalized (includes an "Unassigned" row). */
export async function getSpendByTeam(): Promise<SpendByTeamRow[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("spend_by_team");
    if (error) {
      console.error("[m06-dashboard] spend_by_team failed:", error.message);
      return [];
    }
    return ((data ?? []) as SpendByTeamRow[]).map((r) => ({
      ...r,
      monthly_amount: Number(r.monthly_amount),
      subscription_count: Number(r.subscription_count),
    }));
  } catch (err) {
    console.error("[m06-dashboard] spend_by_team unavailable:", err);
    return [];
  }
}

/**
 * ACTUAL money-out per team, from transactions → card → team (the counterpart
 * to getSpendByTeam's planned/subscription spend). Includes an "Unassigned"
 * row (team_id null) for spend on cards not yet assigned to a team.
 */
export async function getSpendByTeamActual(): Promise<SpendByTeamActualRow[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("spend_by_team_actual");
    if (error) {
      console.error(
        "[m06-dashboard] spend_by_team_actual failed:",
        error.message,
      );
      return [];
    }
    return ((data ?? []) as SpendByTeamActualRow[]).map((r) => ({
      ...r,
      total_out: Number(r.total_out),
      transaction_count: Number(r.transaction_count),
    }));
  } catch (err) {
    console.error("[m06-dashboard] spend_by_team_actual unavailable:", err);
    return [];
  }
}

/** Total money-out per Mercury card across all synced transactions. */
export async function getSpendByCard(): Promise<SpendByCardRow[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("spend_by_card");
    if (error) {
      console.error("[m06-dashboard] spend_by_card failed:", error.message);
      return [];
    }
    return ((data ?? []) as SpendByCardRow[]).map((r) => ({
      ...r,
      total_out: Number(r.total_out),
      transaction_count: Number(r.transaction_count),
    }));
  } catch (err) {
    console.error("[m06-dashboard] spend_by_card unavailable:", err);
    return [];
  }
}

/** Actual money-out bucketed by calendar month; optionally one card only. */
export async function getSpendByMonth(
  months = 12,
  cardId?: string,
): Promise<SpendByMonthRow[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("spend_by_month", {
      p_months: months,
      ...(cardId ? { p_card_id: cardId } : {}),
    });
    if (error) {
      console.error("[m06-dashboard] spend_by_month failed:", error.message);
      return [];
    }
    return ((data ?? []) as SpendByMonthRow[]).map((r) => ({
      ...r,
      total_out: Number(r.total_out),
      transaction_count: Number(r.transaction_count),
    }));
  } catch (err) {
    console.error("[m06-dashboard] spend_by_month unavailable:", err);
    return [];
  }
}
