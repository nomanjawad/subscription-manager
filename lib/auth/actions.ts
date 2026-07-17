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
  // Allowlist check up front — even a valid Supabase user that isn't an admin
  // gets no session benefit (middleware would block them anyway).
  if (!adminEmails().includes(email)) {
    return { error: "This email is not authorized." };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  // Same-site paths only: must start with exactly one "/" — "//host" is
  // protocol-relative and browsers treat "/\host" the same way.
  redirect(/^\/(?![/\\])/.test(next) ? next : "/");
}

export async function signOut(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
