// m08-teams — read queries. Service client only (RLS is deny-all). Filtering
// and joins happen in the database / PostgREST embeds, never in JS.
import { createServiceClient } from "@/lib/supabase/server";
import type {
  TeamLeadRow,
  TeamOption,
  TeamOverviewRow,
  TeamRow,
} from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** All teams, ordered by name — admin table. */
export async function getTeams(): Promise<TeamRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load teams: ${error.message}`);
  }
  return (data ?? []) as TeamRow[];
}

/**
 * Minimal {id,name} list for pickers. PUBLIC CONTRACT — consumed by the
 * request form; keep the shape stable.
 */
export async function getTeamsPublic(): Promise<TeamOption[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id,name")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load teams: ${error.message}`);
  }
  return (data ?? []) as TeamOption[];
}

/** Per-team rollups for the admin overview table (team_overview RPC). */
export async function getTeamOverview(): Promise<TeamOverviewRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("team_overview");
  if (error) {
    throw new Error(`Failed to load team overview: ${error.message}`);
  }
  return ((data ?? []) as TeamOverviewRow[]).map((row) => ({
    team_id: row.team_id,
    name: row.name,
    auto_approve: row.auto_approve,
    lead_count: Number(row.lead_count),
    subscription_count: Number(row.subscription_count),
    monthly_spend: Number(row.monthly_spend),
    open_request_count: Number(row.open_request_count),
  }));
}

/** Team leads joined with their team's name, newest first. */
export async function getTeamLeads(): Promise<TeamLeadRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,team_id,created_at, teams:team_id(name)")
    .eq("role", "team_lead")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load team leads: ${error.message}`);
  }

  type EmbeddedRow = {
    id: string;
    email: string;
    full_name: string | null;
    team_id: string | null;
    created_at: string;
    // PostgREST embeds a to-one relation as an object (or null); some setups
    // type it as an array — handle both defensively.
    teams: { name: string } | { name: string }[] | null;
  };

  return ((data ?? []) as unknown as EmbeddedRow[]).map((row) => {
    const team = Array.isArray(row.teams) ? (row.teams[0] ?? null) : row.teams;
    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      team_id: row.team_id,
      team_name: team?.name ?? null,
      created_at: row.created_at,
    };
  });
}

/** A single team by id, or null. */
export async function getTeamById(id: string): Promise<TeamRow | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load team: ${error.message}`);
  }
  return (data as TeamRow | null) ?? null;
}
