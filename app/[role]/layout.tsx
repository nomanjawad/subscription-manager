// Role segment guard. Every authenticated page lives under /admin, /teamlead,
// or /buyer. This layout validates the prefix and enforces that the signed-in
// account's real role matches it — a defense-in-depth layer on top of proxy.ts.
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/auth";
import { homeFor, roleForPrefix } from "@/lib/roles";

export default async function RoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ role: string }>;
}) {
  const { role: prefix } = await params;
  const wanted = roleForPrefix(prefix);
  if (!wanted) notFound();

  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.role !== wanted) redirect(homeFor(session.role));

  return <>{children}</>;
}
