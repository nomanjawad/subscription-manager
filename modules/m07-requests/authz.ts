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
 * Whether `user` may REVIEW (approve/reject) a request routed to `requestTeamId`.
 *   - admin: any request (including unassigned).
 *   - team_lead: only when they have a team AND it matches the request's team.
 *     A lead with no team, or a request with no team, is never actionable by a
 *     lead.
 *   - buyer: never — buyers purchase, they don't decide approvals.
 */
export function canActOnRequestTeam(
  user: ActingUser,
  requestTeamId: string | null,
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "buyer") return false;
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

/**
 * Whether `user` may PURCHASE an approved request (which creates the real
 * subscription). This is the buyers' job and is company-wide — no team scope:
 *   - admin or buyer: yes, for any team.
 *   - team_lead: no — leads approve/reject, buyers buy.
 */
export function canPurchase(user: ActingUser): boolean {
  return user.role === "admin" || user.role === "buyer";
}

/** Throwing form of {@link canPurchase} for use inside server actions. */
export function assertCanPurchase(user: ActingUser): void {
  if (!canPurchase(user)) {
    throw new Error("Only buyers and admins can mark requests purchased.");
  }
}
