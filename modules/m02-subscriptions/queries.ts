// m02-subscriptions — read queries against the subscription_overview view
// (the sanctioned cross-table read; no JS joins).
import { createServiceClient } from "@/lib/supabase/server";
import type { SubscriptionOverviewRow } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SubscriptionFilters {
  tag?: string;
  status?: "active" | "cancelled";
  cycle?: "monthly" | "yearly";
  q?: string;
}

/**
 * Filtered subscription list. Every filter is applied in the database
 * (eq/ilike on subscription_overview) — never as a JS array filter.
 */
export async function getSubscriptions(
  filters: SubscriptionFilters = {},
): Promise<SubscriptionOverviewRow[]> {
  const supabase = createServiceClient();
  let query = supabase.from("subscription_overview").select("*");

  if (filters.tag) query = query.eq("tag", filters.tag);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.cycle) query = query.eq("billing_cycle", filters.cycle);
  if (filters.q) {
    // PostgREST or() values are delimited by commas/parens and may be quoted,
    // and ilike patterns use % wildcards and \ escapes — strip all of them so
    // user input can neither break the filter grammar nor the pattern.
    const q = filters.q.replace(/[%,()"\\]/g, "").trim();
    if (q !== "") {
      query = query.or(`platform.ilike.%${q}%,product.ilike.%${q}%`);
    }
  }

  const { data, error } = await query.order("next_renewal_date", {
    ascending: true,
  });

  if (error) {
    throw new Error(`Failed to load subscriptions: ${error.message}`);
  }
  return (data ?? []) as SubscriptionOverviewRow[];
}

/** Distinct tags (for the filter dropdown + form datalist). */
export async function getTags(): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("subscription_tags");

  if (error) {
    throw new Error(`Failed to load tags: ${error.message}`);
  }
  return ((data ?? []) as { tag: string }[]).map((row) => row.tag);
}

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
