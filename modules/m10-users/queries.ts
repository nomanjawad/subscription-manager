// m10-users — read queries for the admin Users directory. Service client only
// (RLS is deny-all). Members are non-login people assigned to a team lead.
import { createServiceClient } from "@/lib/supabase/server";
import type {
  LeadOption,
  MemberDirectoryRow,
  UnrecognizedRequesterRow,
} from "@/lib/types";

/** All members with their lead + team + request activity (member_directory RPC). */
export async function getMembers(): Promise<MemberDirectoryRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("member_directory");
  if (error) {
    throw new Error(`Failed to load users: ${error.message}`);
  }
  return ((data ?? []) as MemberDirectoryRow[]).map((r) => ({
    ...r,
    request_count: Number(r.request_count),
  }));
}

/**
 * Request emails that match no member — so an admin can add them and route
 * their future requests automatically (unrecognized_requesters RPC).
 */
export async function getUnrecognizedRequesters(): Promise<
  UnrecognizedRequesterRow[]
> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("unrecognized_requesters");
  if (error) {
    throw new Error(`Failed to load unrecognized requesters: ${error.message}`);
  }
  return ((data ?? []) as UnrecognizedRequesterRow[]).map((r) => ({
    ...r,
    request_count: Number(r.request_count),
  }));
}

/**
 * Team leads as pickable options for the "assign to lead" controls. Label is
 * the lead's name (or email) plus their team, so the admin can tell leads on
 * different teams apart.
 */
export async function getLeadOptions(): Promise<LeadOption[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name, teams:team_id(name)")
    .eq("role", "team_lead")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load team leads: ${error.message}`);
  }

  type EmbeddedRow = {
    id: string;
    email: string;
    full_name: string | null;
    // PostgREST embeds a to-one relation as an object (or null); some setups
    // type it as an array — handle both defensively.
    teams: { name: string } | { name: string }[] | null;
  };

  return ((data ?? []) as unknown as EmbeddedRow[]).map((row) => {
    const team = Array.isArray(row.teams) ? (row.teams[0] ?? null) : row.teams;
    const who = row.full_name?.trim() || row.email;
    const label = team?.name ? `${who} · ${team.name}` : `${who} · No team`;
    return { id: row.id, label };
  });
}
