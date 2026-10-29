// m12-admins — read queries for the admin Admins directory. Service client only
// (RLS is deny-all). Admins are login users (role='admin') — this table is the
// admin allow list; there is no env-based admin.
import { createServiceClient } from "@/lib/supabase/server";
import type { AdminRow } from "@/lib/types";

export async function getAdmins(): Promise<AdminRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("role", "admin")
    .order("email", { ascending: true });

  if (error) {
    throw new Error(`Failed to load admins: ${error.message}`);
  }
  return (data ?? []) as AdminRow[];
}
