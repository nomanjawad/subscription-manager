// lib/email — recipient resolution shared by the request + cancellation notify
// layers. Service client only (RLS is deny-all). Every helper degrades to []
// / null on error so a notification never blocks the underlying action.
import { adminEmails } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";

/** Team-lead mailbox addresses for a team (empty when no team / none). */
export async function teamLeadEmails(teamId: string | null): Promise<string[]> {
  if (!teamId) return [];
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "team_lead")
    .eq("team_id", teamId);
  return ((data ?? []) as { email: string }[]).map((r) => r.email);
}

/** Every buyer's mailbox address. */
export async function buyerEmails(): Promise<string[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "buyer");
  return ((data ?? []) as { email: string }[]).map((r) => r.email);
}

/** Every admin's mailbox address (DB admins ∪ ADMIN_EMAILS bootstrap). */
export async function allAdminEmails(): Promise<string[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "admin");
  const dbAdmins = ((data ?? []) as { email: string }[]).map((r) => r.email);
  return Array.from(new Set([...adminEmails(), ...dbAdmins]));
}

/** A single profile's email by id, or null. */
export async function profileEmail(id: string | null): Promise<string | null> {
  if (!id) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", id)
    .maybeSingle();
  return (data as { email: string } | null)?.email ?? null;
}

/** A team's display name by id, or null. */
export async function teamName(teamId: string | null): Promise<string | null> {
  if (!teamId) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .maybeSingle();
  return (data as { name: string } | null)?.name ?? null;
}
