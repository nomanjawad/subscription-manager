// m13-cancellations — read queries against cancellation_overview (the sanctioned
// cross-table read). DB-side filtering only.
import { createServiceClient } from "@/lib/supabase/server";
import type { CancellationOverviewRow, CancellationStatus } from "@/lib/types";

export interface CancellationFilters {
  /** Team scope (team leads: their team; admins: an optional filter). */
  teamId?: string;
  status?: CancellationStatus;
}

/** Cancellation requests, newest first, filtered in the database. */
export async function getCancellations(
  filters: CancellationFilters = {},
): Promise<CancellationOverviewRow[]> {
  const supabase = createServiceClient();
  let query = supabase.from("cancellation_overview").select("*");

  if (filters.teamId) query = query.eq("team_id", filters.teamId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to load cancellations: ${error.message}`);
  }
  return (data ?? []) as CancellationOverviewRow[];
}
