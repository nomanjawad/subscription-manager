"use server";

// m01-cards — server action wrapper so UI forms can trigger a card sync.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { syncCards } from "./sync";

export async function syncCardsAction(): Promise<void> {
  // Global Mercury sync — admin only, like the renewal-check run.
  await requireAdmin();
  await syncCards();
  revalidatePath("/subscriptions");
}
