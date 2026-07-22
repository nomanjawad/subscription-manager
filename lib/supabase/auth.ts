// Cookie-based Supabase client for AUTH (login sessions). Uses the publishable
// key — it can only authenticate users; data access stays on the service
// client (lib/supabase/server.ts) behind deny-all RLS.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { homeFor } from "@/lib/roles";

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

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The signed-in user resolved to a role + team.
 *   - role/team come from the JWT (auth.users.app_metadata), set when an admin
 *     creates a team lead. This keeps middleware/page checks DB-free.
 *   - Any email in ADMIN_EMAILS is always an admin (bootstrap super-admin),
 *     even without app_metadata — that's how the seeded admin logs in.
 */
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  teamId: string | null;
}

function resolveRole(email: string, metaRole: unknown): UserRole | null {
  if (metaRole === "admin" || metaRole === "team_lead" || metaRole === "buyer")
    return metaRole;
  if (adminEmails().includes(email.toLowerCase())) return "admin";
  return null;
}

/** The current session as a role-resolved user, or null if unauthenticated
 *  / not authorized (a valid Supabase user with no admin/team_lead role). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const role = resolveRole(user.email, user.app_metadata?.role);
  if (!role) return null;

  const rawTeam = user.app_metadata?.team_id;
  const teamId = typeof rawTeam === "string" && rawTeam ? rawTeam : null;

  return { id: user.id, email: user.email, role, teamId };
}

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
