// Google OAuth callback: exchange the PKCE code for a session, then allow only
// accounts an admin has added (role in app_metadata). Anyone else is signed
// out, and the auth user Supabase just created for them is removed so stray
// Google accounts don't pile up. Allowed users continue to the mandatory
// authenticator step on /login/mfa.
import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient, resolveRole } from "@/lib/supabase/auth";
import { deleteAuthAccount } from "@/modules/m08-teams/accounts";

export const dynamic = "force-dynamic";

/** An auth user created within this long counts as created by this sign-in. */
const JUST_CREATED_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/";

  const toLogin = (error: string) =>
    NextResponse.redirect(new URL(`/login?error=${error}`, url.origin));

  if (!code) return toLogin("oauth");

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) return toLogin("oauth");

  const user = data.user;
  const role = resolveRole(user.app_metadata?.role);
  if (!role) {
    await supabase.auth.signOut();
    const createdAt = Date.parse(user.created_at);
    if (
      !user.app_metadata?.role &&
      Number.isFinite(createdAt) &&
      Date.now() - createdAt < JUST_CREATED_MS
    ) {
      try {
        await deleteAuthAccount(user.id);
      } catch (err) {
        console.error("[auth/callback] could not remove unlisted account:", err);
      }
    }
    return toLogin("not_allowed");
  }

  return NextResponse.redirect(
    new URL(`/login/mfa?next=${encodeURIComponent(next)}`, url.origin),
  );
}
