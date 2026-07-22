// Root index — send each visitor to their role's home (or login). Middleware
// normally handles this; this is the server-side fallback.
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/auth";
import { homeFor } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSessionUser();
  redirect(session ? homeFor(session.role) : "/login");
}
