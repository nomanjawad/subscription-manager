// m02-subscriptions — read queries against the subscription_overview view
// (the sanctioned cross-table read; no JS joins).
import { createServiceClient } from "@/lib/supabase/server";
import type { SubscriptionOverviewRow } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One subscription (with card + last-check context) for the edit form. */
export async function getSubscriptionOverview(
  id: string,
): Promise<SubscriptionOverviewRow | null> {
  if (!UUID_RE.test(id)) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subscription_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load subscription: ${error.message}`);
  }
  return (data as SubscriptionOverviewRow | null) ?? null;
}
