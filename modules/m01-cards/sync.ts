// m01-cards — pull Mercury cards into the local `cards` table.
import { listAllCards } from "@/lib/mercury";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Sync all Mercury cards into `cards`, keyed on mercury_card_id.
 * `nickname` is intentionally omitted from the upsert payload so a
 * user-assigned nickname on an existing row is never overwritten.
 */
export async function syncCards(): Promise<{ synced: number }> {
  const cards = await listAllCards();
  if (cards.length === 0) return { synced: 0 };

  const now = new Date().toISOString();
  const rows = cards.map((card) => ({
    mercury_card_id: card.cardId,
    mercury_account_id: card.accountId,
    name_on_card: card.nameOnCard,
    last4: card.lastFourDigits,
    network: card.network,
    card_type: card.type,
    status: card.status,
    synced_at: now,
  }));

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("cards")
    .upsert(rows, { onConflict: "mercury_card_id" });

  if (error) {
    throw new Error(`Card sync failed: ${error.message}`);
  }
  return { synced: rows.length };
}
