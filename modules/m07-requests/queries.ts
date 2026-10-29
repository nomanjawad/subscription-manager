// m07-requests — read queries. Filtering happens in the database, not in JS.
import { createServiceClient } from "@/lib/supabase/server";
import type {
  RequestCountsRow,
  RequestStatus,
  SubscriptionRequestRow,
} from "@/lib/types";

/** Requests in the given status(es), newest first. DB-side filter. When a
 * teamId is given the result is scoped to that team (used for team leads). */
export async function getRequests(
  status: RequestStatus | RequestStatus[],
  teamId?: string,
): Promise<SubscriptionRequestRow[]> {
  const supabase = createServiceClient();

  // Embed only the credentials row's key — enough to flag has_credentials;
  // the ciphertext is never selected here.
  let query = supabase
    .from("subscription_requests")
    .select("*, request_credentials(request_id)");
  query = Array.isArray(status)
    ? query.in("status", status)
    : query.eq("status", status);
  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
  if (error) {
    throw new Error(`Failed to load requests: ${error.message}`);
  }
  type EmbeddedRow = Omit<SubscriptionRequestRow, "has_credentials"> & {
    // A one-to-one embed comes back as an object (or null); handle an array
    // defensively too.
    request_credentials: { request_id: string } | { request_id: string }[] | null;
  };
  return ((data ?? []) as unknown as EmbeddedRow[]).map(
    ({ request_credentials, ...row }) => ({
      ...row,
      has_credentials: Array.isArray(request_credentials)
        ? request_credentials.length > 0
        : request_credentials !== null,
    }),
  );
}

/** Per-status counts for the admin tab badges (request_counts RPC). Scoped to
 * a team when teamId is provided. */
export async function getRequestCounts(
  teamId?: string,
): Promise<Record<RequestStatus, number>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc(
    "request_counts",
    teamId ? { p_team_id: teamId } : {},
  );
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
