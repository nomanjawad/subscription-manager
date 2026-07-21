import { describe, expect, it } from "vitest";
import {
  assertCanActOnRequestTeam,
  canActOnRequestTeam,
  type ActingUser,
} from "./authz";

const TEAM_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TEAM_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const admin: ActingUser = { role: "admin", teamId: null };
const adminWithTeam: ActingUser = { role: "admin", teamId: TEAM_A };
const leadA: ActingUser = { role: "team_lead", teamId: TEAM_A };
const leadNoTeam: ActingUser = { role: "team_lead", teamId: null };

describe("canActOnRequestTeam", () => {
  it("lets an admin act on any team's request", () => {
    expect(canActOnRequestTeam(admin, TEAM_A)).toBe(true);
    expect(canActOnRequestTeam(admin, TEAM_B)).toBe(true);
    expect(canActOnRequestTeam(adminWithTeam, TEAM_B)).toBe(true);
  });

  it("lets an admin act on an unassigned request", () => {
    expect(canActOnRequestTeam(admin, null)).toBe(true);
  });

  it("lets a team lead act on their own team's request", () => {
    expect(canActOnRequestTeam(leadA, TEAM_A)).toBe(true);
  });

  it("blocks a team lead from another team's request", () => {
    expect(canActOnRequestTeam(leadA, TEAM_B)).toBe(false);
  });

  it("blocks a team lead from an unassigned request", () => {
    expect(canActOnRequestTeam(leadA, null)).toBe(false);
  });

  it("blocks a team lead who has no team, even on an unassigned request", () => {
    // Guards against null === null being treated as a match.
    expect(canActOnRequestTeam(leadNoTeam, null)).toBe(false);
    expect(canActOnRequestTeam(leadNoTeam, TEAM_A)).toBe(false);
  });
});

describe("assertCanActOnRequestTeam", () => {
  it("does not throw when the user is allowed", () => {
    expect(() => assertCanActOnRequestTeam(admin, TEAM_B)).not.toThrow();
    expect(() => assertCanActOnRequestTeam(leadA, TEAM_A)).not.toThrow();
  });

  it("throws a generic, non-leaky message when the user is not allowed", () => {
    expect(() => assertCanActOnRequestTeam(leadA, TEAM_B)).toThrow(
      "You can only act on your own team's requests.",
    );
    expect(() => assertCanActOnRequestTeam(leadNoTeam, null)).toThrow();
  });
});
