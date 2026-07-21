// m07-requests — pure authorization helpers for acting on a request.
//
// Kept in its own (non-"use server") module so the team-scoping rule can be
// unit-tested in isolation, and reused by every review/purchase action without
// duplicating the check. The rule is deliberately conservative: a team lead may
// only ever act on requests routed to their OWN team; unassigned requests
// (team_id = null) are admin-only.
import type { UserRole } from "@/lib/types";

export interface ActingUser {
  role: UserRole;
  teamId: string | null;
}

/**
 * Whether `user` may review/purchase a request routed to `requestTeamId`.
 *   - admin: any request (including unassigned).
 *   - team_lead: only when they have a team AND it matches the request's team.
 *     A lead with no team, or a request with no team, is never actionable by a
 *     lead.
 */
export function canActOnRequestTeam(
  user: ActingUser,
  requestTeamId: string | null,
): boolean {
  if (user.role === "admin") return true;
  return user.teamId !== null && user.teamId === requestTeamId;
}

/** Throwing form of {@link canActOnRequestTeam} for use inside server actions. */
export function assertCanActOnRequestTeam(
  user: ActingUser,
  requestTeamId: string | null,
): void {
  if (!canActOnRequestTeam(user, requestTeamId)) {
    throw new Error("You can only act on your own team's requests.");
  }
}
