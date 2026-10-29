"use server";

// Sign-in is Google only (Supabase OAuth, PKCE), followed by a mandatory
// authenticator-app code on /login/mfa. Who may sign in is decided after the
// Google step, in app/auth/callback: only accounts an admin has added (role in
// app_metadata) get through.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth";

/** A same-site path to return to after sign-in, or "/" (role home). */
function safeNext(raw: unknown): string {
  const next = typeof raw === "string" ? raw : "/";
  return /^\/(?![/\\])/.test(next) ? next : "/";
}

async function siteOrigin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  // Supabase only redirects to URLs on its allow list, so a spoofed Host
  // header can't send the user anywhere unexpected.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"));
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      // Always show the account chooser so a shared browser can't silently
      // reuse someone else's Google session.
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
