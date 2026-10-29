"use server";

// m12-admins — admin server actions for admin accounts. Every export is
// admin-only. Adding an admin creates a password-less auth account
// (role='admin' in app_metadata) + profile; they sign in with Google and set
// up an authenticator app. Removing deletes the auth account (the profile
// cascades). You can't remove yourself or the last admin.
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import type { UserRole } from "@/lib/types";
import { createAdminAccount, deleteAuthAccount } from "@/modules/m08-teams/accounts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function addAdmin(formData: FormData): Promise<void> {
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

  const supabase = createServiceClient();

  // 1) Create the GoTrue account (role lives in app_metadata; no team).
  const userId = await createAdminAccount({ email, fullName });

  // 2) Mirror it in profiles. On failure, remove the account so we never leave
  //    an auth user without a profile.
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email,
    full_name: fullName,
    role: "admin" satisfies UserRole,
    team_id: null,
  });

  if (profileError) {
    await deleteAuthAccount(userId);
    if (profileError.code === "23505") {
      throw new Error("A user with this email already exists.");
    }
    throw new Error(`Failed to create admin: ${profileError.message}`);
  }

  revalidatePath("/admin/admins");
}

export async function removeAdmin(userId: string): Promise<void> {
  const session = await requireAdmin();
  if (!UUID_RE.test(userId)) throw new Error("Invalid user id.");
  if (userId === session.id) {
    throw new Error("You can't remove yourself — ask another admin.");
  }

  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(`Failed to check admins: ${error.message}`);
  if ((count ?? 0) <= 1) {
    throw new Error("You can't remove the last admin.");
  }

  // Deleting the auth account ends their sessions and cascades to profiles.
  await deleteAuthAccount(userId);

  revalidatePath("/admin/admins");
}
