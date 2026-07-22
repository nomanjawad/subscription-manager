// m01-cards — read queries. Filtering happens in the database, not in JS.
import { createServiceClient } from "@/lib/supabase/server";
import type { CardRow, CardWithTeamRow } from "@/lib/types";

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

/** Every synced card (any status) with its assigned team's name — feeds the
 *  admin Cards page. */
export async function getAllCards(): Promise<CardWithTeamRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*, teams:team_id(name)")
    .order("last4", { ascending: true });

  if (error) {
    throw new Error(`Failed to load cards: ${error.message}`);
  }

  type EmbeddedRow = CardRow & {
    // PostgREST embeds a to-one relation as an object (or null); some setups
    // type it as an array — handle both defensively.
    teams: { name: string } | { name: string }[] | null;
  };

  return ((data ?? []) as unknown as EmbeddedRow[]).map(({ teams, ...card }) => {
    const team = Array.isArray(teams) ? (teams[0] ?? null) : teams;
    return { ...card, team_name: team?.name ?? null };
  });
}
