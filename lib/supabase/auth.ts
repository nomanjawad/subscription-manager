// Cookie-based Supabase client for AUTH (login sessions). Uses the publishable
// key — it can only authenticate users; data access stays on the service
// client (lib/supabase/server.ts) behind deny-all RLS.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

/** The signed-in admin user, or null. */
export async function getAdminUser() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return adminEmails().includes(user.email.toLowerCase()) ? user : null;
}
