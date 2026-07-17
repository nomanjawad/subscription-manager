// m07-requests — read queries. Filtering happens in the database, not in JS.
import { createServiceClient } from "@/lib/supabase/server";
import type {
  RequestCountsRow,
  RequestStatus,
  SubscriptionRequestRow,
} from "@/lib/types";

/** Requests in the given status(es), newest first. DB-side filter. */
export async function getRequests(
  status: RequestStatus | RequestStatus[],
): Promise<SubscriptionRequestRow[]> {
  const supabase = createServiceClient();

  let query = supabase.from("subscription_requests").select("*");
  query = Array.isArray(status)
    ? query.in("status", status)
    : query.eq("status", status);

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
  if (error) {
    throw new Error(`Failed to load requests: ${error.message}`);
  }
  return (data ?? []) as SubscriptionRequestRow[];
}

/** Per-status counts for the admin tab badges (request_counts RPC). */
export async function getRequestCounts(): Promise<
  Record<RequestStatus, number>
> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("request_counts");
  if (error) {
    throw new Error(`Failed to load request counts: ${error.message}`);
  }

  const counts: Record<RequestStatus, number> = {
    requested: 0,
    approved: 0,
    rejected: 0,
    purchased: 0,
  };
  for (const row of (data ?? []) as RequestCountsRow[]) {
    counts[row.status] = Number(row.count);
  }
  return counts;
}
