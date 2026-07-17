"use server";

// m01-cards — server action wrapper so UI forms can trigger a card sync.
import { revalidatePath } from "next/cache";
import { syncCards } from "./sync";

export async function syncCardsAction(): Promise<void> {
  await syncCards();
  revalidatePath("/subscriptions");
}
