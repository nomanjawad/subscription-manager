// m11-buyers — read queries for the admin Buyers directory. Service client only
// (RLS is deny-all). Buyers are login users (role='buyer', no team) whose job
// is to purchase approved requests company-wide.
import { createServiceClient } from "@/lib/supabase/server";
import type { BuyerRow } from "@/lib/types";

/** All buyers with a count of the subscriptions they've bought. */
export async function getBuyers(): Promise<BuyerRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("role", "buyer")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load buyers: ${error.message}`);
  }

  const buyers = (data ?? []) as Omit<BuyerRow, "purchase_count">[];

  // Purchase counts: one head-count per buyer (buyers are few — no N+1 concern).
  const counts = await Promise.all(
    buyers.map((b) =>
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("purchased_by", b.id),
    ),
  );

  return buyers.map((b, i) => ({
    ...b,
    purchase_count: counts[i].count ?? 0,
  }));
}
