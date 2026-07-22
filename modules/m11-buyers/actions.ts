"use server";

// m11-buyers — admin server actions for buyer accounts. Every export is
// admin-only. A buyer is a login user (role='buyer', no team): they see the
// company-wide approved queue, purchase requests, and use the create form.
// Auth account + profile are created together (and compensated on failure),
// exactly like team leads — minus the team.
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import type { UserRole } from "@/lib/types";
import { createBuyerAccount, deleteAuthAccount } from "@/modules/m08-teams/accounts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function assertUuid(id: string, what: string): void {
  if (!UUID_RE.test(id)) {
    throw new Error(`Invalid ${what} id.`);
  }
}

export async function addBuyer(formData: FormData): Promise<void> {
  await requireAdmin();

  const email = text(formData, "email")?.toLowerCase() ?? null;
  if (!email) throw new Error("Email is required.");
  if (email.length > 200 || !EMAIL_RE.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const fullName = text(formData, "full_name");
  if (fullName !== null && fullName.length > 200) {
    throw new Error("Full name must be at most 200 characters.");
  }

  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password is required and must be at least 8 characters.");
  }

  const supabase = createServiceClient();

  // 1) Create the GoTrue account (role lives in app_metadata; no team).
  const userId = await createBuyerAccount({ email, fullName, password });

  // 2) Mirror it in profiles. On failure, remove the account so we never leave
  //    an auth user without a profile.
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email,
    full_name: fullName,
    role: "buyer" satisfies UserRole,
    team_id: null,
  });

  if (profileError) {
    await deleteAuthAccount(userId);
    if (profileError.code === "23505") {
      throw new Error("A user with this email already exists.");
    }
    throw new Error(`Failed to create buyer: ${profileError.message}`);
  }

  revalidatePath("/buyers");
}

export async function removeBuyer(userId: string): Promise<void> {
  await requireAdmin();
  assertUuid(userId, "user");

  // Deleting the auth account cascades to the profiles row (profiles.id
  // references auth.users ON DELETE CASCADE). subscriptions.purchased_by is
  // ON DELETE SET NULL, so their purchases are kept (just unlinked).
  await deleteAuthAccount(userId);

  revalidatePath("/buyers");
}
