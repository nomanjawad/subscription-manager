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

/**
 * Assign a card to a team (or clear it with null). Transactions on the card
 * inherit this team for the "actual spend by team" tracking, so re-buckets the
 * dashboard — revalidate it too. Admin-only.
 */
export async function setCardTeam(
  cardId: string,
  teamId: string | null,
): Promise<void> {
  await requireAdmin();

  if (!UUID_RE.test(cardId)) {
    throw new Error("Invalid card id.");
  }
  if (teamId !== null && !UUID_RE.test(teamId)) {
    throw new Error("Invalid team id.");
  }

  const supabase = createServiceClient();

  // Confirm the team exists before pointing a card at it.
  if (teamId !== null) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .maybeSingle();
    if (teamError) {
      throw new Error(`Failed to verify team: ${teamError.message}`);
    }
    if (!team) {
      throw new Error("That team no longer exists.");
    }
  }

  const { data, error } = await supabase
    .from("cards")
    .update({ team_id: teamId })
    .eq("id", cardId)
    .select("id");

  if (error) {
    throw new Error(`Failed to assign card to team: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error("Card not found.");
  }

  revalidatePath("/cards");
  revalidatePath("/"); // dashboard: actual spend-by-team re-buckets
}
