// m01-cards — read queries. Filtering happens in the database, not in JS.
import { createServiceClient } from "@/lib/supabase/server";
import type { CardRow } from "@/lib/types";

/** Active cards, ordered by last4 — feeds the card picker. */
export async function getActiveCards(): Promise<CardRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("status", "active")
    .order("last4", { ascending: true });

  if (error) {
    throw new Error(`Failed to load cards: ${error.message}`);
  }
  return (data ?? []) as CardRow[];
}

/** Every synced card regardless of status — feeds the admin Cards page. */
export async function getAllCards(): Promise<CardRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .order("last4", { ascending: true });

  if (error) {
    throw new Error(`Failed to load cards: ${error.message}`);
  }
  return (data ?? []) as CardRow[];
}
