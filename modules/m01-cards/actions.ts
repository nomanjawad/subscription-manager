"use server";

// m01-cards — server actions for the admin Cards page: sync from Mercury and
// set a per-card alias (nickname). Both are admin-only. The alias is the
// `cards.nickname` column, which the Mercury sync deliberately never
// overwrites, so a user-assigned alias survives every re-sync.
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { syncCards } from "./sync";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALIAS_MAX = 60;

export async function syncCardsAction(): Promise<void> {
  // Global Mercury sync — admin only, like the renewal-check run.
  await requireAdmin();
  await syncCards();
  revalidatePath("/cards");
  revalidatePath("/subscriptions");
}

/**
 * Set (or clear) a card's alias. Pass an empty/whitespace string to clear it
 * back to null. Admin-only.
 */
export async function setCardAlias(
  cardId: string,
  alias: string,
): Promise<void> {
  await requireAdmin();

  if (!UUID_RE.test(cardId)) {
    throw new Error("Invalid card id.");
  }

  const trimmed = alias.trim();
  if (trimmed.length > ALIAS_MAX) {
    throw new Error(`Alias must be at most ${ALIAS_MAX} characters.`);
  }
  const nickname = trimmed === "" ? null : trimmed;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cards")
    .update({ nickname })
    .eq("id", cardId)
    .select("id");

  if (error) {
    throw new Error(`Failed to update card alias: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error("Card not found.");
  }

  revalidatePath("/cards");
  revalidatePath("/subscriptions");
}
