"use server";

// m08-teams — admin server actions for teams and team leads.
// Every export is admin-only (requireAdmin redirects non-admins). All DB
// access goes through the service client; auth accounts are managed via the
// GoTrue admin helpers in ./accounts. Team assignments are written to BOTH the
// profiles row and the account's app_metadata so the DB and the JWT stay in
// sync.
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import type { UserRole } from "@/lib/types";
import {
  createTeamLeadAccount,
  deleteTeamLeadAccount,
  updateTeamLeadAccount,
} from "./accounts";

export interface CreateTeamState {
  ok: boolean;
  error: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed string field, or null when missing/empty. */
function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function assertUuid(id: string, what: string): void {
  if (!UUID_RE.test(id)) {
    throw new Error(`Invalid ${what} id.`);
  }
}

/** A checkbox/switch value ("on"/"true") → boolean. */
function checkbox(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true";
}

// ── Teams ────────────────────────────────────────────────────────────────

export async function createTeam(
  _prev: CreateTeamState,
  formData: FormData,
): Promise<CreateTeamState> {
  await requireAdmin();
  const fail = (error: string): CreateTeamState => ({ ok: false, error });

  const name = text(formData, "name");
  if (!name) return fail("Team name is required.");
  if (name.length > 80) return fail("Team name must be at most 80 characters.");

  const autoApprove = checkbox(formData, "auto_approve");

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("teams")
    .insert({ name, auto_approve: autoApprove });

  if (error) {
    // 23505 = unique_violation on teams.name.
    if (error.code === "23505" || /duplicate key/i.test(error.message)) {
      return fail("A team with that name already exists.");
    }
    return fail("Could not create the team right now. Please try again.");
  }

  revalidatePath("/teams");
  return { ok: true, error: null };
}

export async function setAutoApprove(
  teamId: string,
  value: boolean,
): Promise<void> {
  await requireAdmin();
  assertUuid(teamId, "team");

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("teams")
    .update({ auto_approve: value })
    .eq("id", teamId);

  if (error) {
    throw new Error(`Failed to update team: ${error.message}`);
  }
  revalidatePath("/teams");
}

export async function renameTeam(
  teamId: string,
  name: string,
): Promise<void> {
  await requireAdmin();
  assertUuid(teamId, "team");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Team name is required.");
  if (trimmed.length > 80) {
    throw new Error("Team name must be at most 80 characters.");
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("teams")
    .update({ name: trimmed })
    .eq("id", teamId);

  if (error) {
    if (error.code === "23505" || /duplicate key/i.test(error.message)) {
      throw new Error("A team with that name already exists.");
    }
    throw new Error(`Failed to rename team: ${error.message}`);
  }
  revalidatePath("/teams");
}

export async function deleteTeam(teamId: string): Promise<void> {
  await requireAdmin();
  assertUuid(teamId, "team");

  const supabase = createServiceClient();

  // Detach the team's leads at the JWT level first so their tokens don't keep
  // pointing at a team that's about to vanish. The DB FK (ON DELETE SET NULL)
  // clears profiles.team_id / subscriptions.team_id / requests.team_id.
  const { data: leads, error: leadsError } = await supabase
    .from("profiles")
    .select("id")
    .eq("team_id", teamId);

  if (leadsError) {
    throw new Error(`Failed to load team members: ${leadsError.message}`);
  }

  for (const lead of (leads ?? []) as { id: string }[]) {
    await updateTeamLeadAccount(lead.id, { teamId: null });
  }

  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) {
    throw new Error(`Failed to delete team: ${error.message}`);
  }
  revalidatePath("/teams");
}

// ── Team leads ─────────────────────────────────────────────────────────────

export async function addTeamLead(formData: FormData): Promise<void> {
  await requireAdmin();

  const email = text(formData, "email")?.toLowerCase() ?? null;
  if (!email) throw new Error("Email is required.");
  if (email.length > 200 || !EMAIL_RE.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const fullName = text(formData, "full_name");
  if (fullName !== null && fullName.length > 200) {
    throw new Error("Full name must be at most 200 characters.");
  }

  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password is required and must be at least 8 characters.");
  }

  const teamId = text(formData, "team_id");
  if (!teamId) throw new Error("A team is required.");
  assertUuid(teamId, "team");

  const supabase = createServiceClient();

  // Confirm the team exists before creating an orphaned auth account.
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .maybeSingle();
  if (teamError) {
    throw new Error(`Failed to verify team: ${teamError.message}`);
  }
  if (!team) throw new Error("That team no longer exists.");

  // 1) Create the GoTrue account (role + team live in app_metadata).
  const userId = await createTeamLeadAccount({
    email,
    fullName,
    password,
    teamId,
  });

  // 2) Mirror it in profiles. On failure, compensate by removing the account
  //    so we never leave an auth user without a profile.
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email,
    full_name: fullName,
    role: "team_lead" satisfies UserRole,
    team_id: teamId,
  });

  if (profileError) {
    await deleteTeamLeadAccount(userId);
    if (profileError.code === "23505") {
      throw new Error("A user with this email already exists.");
    }
    throw new Error(`Failed to create team lead: ${profileError.message}`);
  }

  revalidatePath("/teams");
}

export async function reassignTeamLead(
  userId: string,
  teamId: string | null,
): Promise<void> {
  await requireAdmin();
  assertUuid(userId, "user");
  if (teamId !== null) assertUuid(teamId, "team");

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({ team_id: teamId })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to reassign team lead: ${error.message}`);
  }

  // Keep the JWT in sync with the DB assignment.
  await updateTeamLeadAccount(userId, { teamId });

  revalidatePath("/teams");
}

export async function removeTeamLead(userId: string): Promise<void> {
  await requireAdmin();
  assertUuid(userId, "user");

  // Deleting the auth account cascades to the profiles row
  // (profiles.id references auth.users ON DELETE CASCADE).
  await deleteTeamLeadAccount(userId);

  revalidatePath("/teams");
}
