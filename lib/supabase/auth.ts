// Cookie-based Supabase client for AUTH (login sessions). Uses the publishable
// key — it can only authenticate users; data access stays on the service
// client (lib/supabase/server.ts) behind deny-all RLS.
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { homeFor } from "@/lib/roles";
import { sessionGate, type SessionGate } from "@/lib/auth/policy";

export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes sessions.
          }
        },
      },
    },
  );
}

/**
 * The signed-in user resolved to a role + team. role/team come from the JWT
 * (auth.users.app_metadata), set when an admin adds the account (Admins,
 * Teams, Buyers pages) — that's the allow list; there is no env-based admin.
 * This keeps proxy/page checks DB-free.
 */
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  /** Unix seconds when this session hard-expires (30 min after sign-in). */
  expiresAt: number;
}

export function resolveRole(metaRole: unknown): UserRole | null {
  return metaRole === "admin" || metaRole === "team_lead" || metaRole === "buyer"
    ? metaRole
    : null;
}

type AuthClient = Awaited<ReturnType<typeof createAuthClient>>;

/** Evaluate the session policy (Google sign-in, 30-min hard limit, TOTP) for
 *  the client's current session. Call after getClaims() has verified it. */
export async function gateFor(supabase: AuthClient): Promise<SessionGate> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { kind: "invalid" };
  return sessionGate({
    currentLevel: data.currentLevel,
    nextLevel: data.nextLevel,
    methods: data.currentAuthenticationMethods ?? [],
  });
}

/**
 * The signed-in user mid-login: authenticated with Google but not yet through
 * the authenticator step. Used by the /login/mfa page only.
 */
export async function getPendingLogin(): Promise<
  | { email: string; gate: SessionGate }
  | null
> {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.email) return null;
  if (!resolveRole(claims.app_metadata?.role)) return null;
  return { email: claims.email, gate: await gateFor(supabase) };
}

/** The current session as a role-resolved user, or null if unauthenticated,
 *  not authorized (no role), or not fully signed in under the session policy
 *  (Google + authenticator code, within 30 minutes of signing in).
 *
 *  The JWT is verified locally (getClaims + the project's ES256 signing keys)
 *  rather than with a round trip to the auth server, and the result is cached
 *  per request so the layout, page and actions share one check. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || !claims.email) return null;

  const role = resolveRole(claims.app_metadata?.role);
  if (!role) return null;

  const gate = await gateFor(supabase);
  if (gate.kind !== "ok") return null;

  const rawTeam = claims.app_metadata?.team_id;
  const teamId = typeof rawTeam === "string" && rawTeam ? rawTeam : null;

  return {
    id: claims.sub,
    email: claims.email,
    role,
    teamId,
    expiresAt: gate.expiresAt,
  };
});

/** The signed-in admin user, or null. (Back-compat helper for the layout.) */
export async function getAdminUser(): Promise<SessionUser | null> {
  const session = await getSessionUser();
  return session?.role === "admin" ? session : null;
}

/** Guard for any authenticated page: returns the session or redirects to login. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return session;
}

/** Guard for admin-only pages: returns the session or redirects away. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect(homeFor(session.role));
  return session;
}

/**
 * Guard for pages the purchasing flow owns (approved queue, create-subscription
 * form): admins and buyers only. Team leads are bounced to their dashboard.
 */
export async function requireBuyerOrAdmin(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.role !== "admin" && session.role !== "buyer")
    redirect(homeFor(session.role));
  return session;
}
