// Role ↔ URL-prefix mapping. Every authenticated page lives under a role prefix
// (/admin, /teamlead, /buyer) so the URL always reflects who's using the app.
// Pure + dependency-free (only a type import) so it's safe to use at the edge
// (proxy.ts) as well as in server components and actions.
import type { UserRole } from "@/lib/types";

export type RolePrefix = "admin" | "teamlead" | "buyer";

export const PREFIX_FOR_ROLE: Record<UserRole, RolePrefix> = {
  admin: "admin",
  team_lead: "teamlead",
  buyer: "buyer",
};

const ROLE_FOR_PREFIX: Record<string, UserRole> = {
  admin: "admin",
  teamlead: "team_lead",
  buyer: "buyer",
};

/** The role a URL prefix belongs to, or null if it isn't a role prefix. */
export function roleForPrefix(prefix: string): UserRole | null {
  return ROLE_FOR_PREFIX[prefix] ?? null;
}

/** A role's home path, e.g. admin → "/admin". */
export function homeFor(role: UserRole): string {
  return `/${PREFIX_FOR_ROLE[role]}`;
}

/** Build a role-prefixed path: rolePath("admin","subscriptions") → "/admin/subscriptions". */
export function rolePath(role: UserRole, section = ""): string {
  const base = `/${PREFIX_FOR_ROLE[role]}`;
  const clean = section.replace(/^\/+/, "");
  return clean ? `${base}/${clean}` : base;
}

// The top-level sections each role may reach (relative to its prefix; "" is the
// role's home). Admin sees everything. Coarse gate — pages still run their own
// requireX guards. Keep in sync with the nav in app/layout.tsx.
const ALLOWED_SECTIONS: Record<UserRole, ReadonlySet<string> | "*"> = {
  admin: "*",
  team_lead: new Set(["", "subscriptions", "requests", "cancellations", "review"]),
  buyer: new Set(["", "subscriptions", "cancellations"]),
};

/** Whether a role may access a top-level section (the first path segment after
 *  its prefix, e.g. "subscriptions" for /admin/subscriptions/new). */
export function isSectionAllowed(role: UserRole, section: string): boolean {
  const allowed = ALLOWED_SECTIONS[role];
  return allowed === "*" || allowed.has(section);
}
