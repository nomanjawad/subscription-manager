"use server";

import { redirect } from "next/navigation";
import { createAuthClient, adminEmails } from "@/lib/supabase/auth";

export interface SignInState {
  error: string | null;
}

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) return { error: "Invalid email or password." };

  // Authorize by role: a team lead carries app_metadata.role; the bootstrap
  // admin(s) come from ADMIN_EMAILS. A valid Supabase user with neither gets
  // no session (defends against accounts created via public GoTrue signup).
  const metaRole = data.user.app_metadata?.role;
  const authorized =
    metaRole === "admin" ||
    metaRole === "team_lead" ||
    adminEmails().includes(email);
  if (!authorized) {
    await supabase.auth.signOut();
    return { error: "This account is not authorized." };
  }

  // Same-site paths only: must start with exactly one "/" — "//host" is
  // protocol-relative and browsers treat "/\host" the same way.
  redirect(/^\/(?![/\\])/.test(next) ? next : "/");
}

export async function signOut(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
