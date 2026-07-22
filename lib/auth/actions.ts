"use server";

import { redirect } from "next/navigation";
import { createAuthClient, adminEmails } from "@/lib/supabase/auth";
import { homeFor } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

export interface SignInState {
  error: string | null;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "admin",
  team_lead: "team lead",
  buyer: "buyer",
};

function isRole(v: string): v is UserRole {
  return v === "admin" || v === "team_lead" || v === "buyer";
}

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const selectedRole = String(formData.get("role") ?? "");

  if (!email || !password) return { error: "Email and password are required." };
  if (!isRole(selectedRole)) {
    return { error: "Select which role you're signing in as." };
  }

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) return { error: "Invalid email or password." };

  // Resolve the account's REAL role from the JWT (ADMIN_EMAILS bootstraps admin).
  // A valid Supabase user with none gets no session (defends against accounts
  // created via public GoTrue signup).
  const metaRole = String(data.user.app_metadata?.role ?? "");
  let actualRole: UserRole | null = null;
  if (isRole(metaRole)) actualRole = metaRole;
  else if (adminEmails().includes(email)) actualRole = "admin";

  if (!actualRole) {
    await supabase.auth.signOut();
    return { error: "This account is not authorized." };
  }

  // The dropdown VERIFIES the role — it never grants it. If the account's real
  // role doesn't match what was picked, reject and clear the session.
  if (actualRole !== selectedRole) {
    await supabase.auth.signOut();
    return {
      error: `This isn't a ${ROLE_LABEL[selectedRole]} account — pick the right role.`,
    };
  }

  const home = homeFor(actualRole);
  // Honor a same-site `next` only when it stays within this role's URL space;
  // otherwise land on the role home.
  const dest =
    /^\/(?![/\\])/.test(next) && (next === home || next.startsWith(`${home}/`))
      ? next
      : home;
  redirect(dest);
}

export async function signOut(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
