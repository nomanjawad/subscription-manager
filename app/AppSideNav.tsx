"use client";

// App sidebar (Astryx SideNav). Role-aware items grouped into titled sections,
// each with a Lucide icon; current route highlighted via usePathname. Sign-out
// posts the existing server action.
//
// Icons are mapped here (client) by a stable id rather than passed from the
// server layout, since React components aren't serializable across that
// boundary. Keep IconId in sync with the `icon` values in app/layout.tsx.
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SideNav,
  SideNavItem,
  SideNavSection,
  SideNavHeading,
} from "@astryxdesign/core/SideNav";
import type { IconType } from "@astryxdesign/core/Icon";
import { Button } from "@astryxdesign/core/Button";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Repeat,
  Inbox,
  Ban,
  ClipboardCheck,
  ShoppingCart,
  UsersRound,
  Users,
  Wallet,
  CreditCard,
  ScanLine,
  BarChart3,
  Settings,
  ReceiptText,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import { homeFor } from "@/lib/roles";
import { signOut } from "@/lib/auth/actions";

export type IconId =
  | "dashboard"
  | "subscriptions"
  | "purchases"
  | "requests"
  | "cancellations"
  | "review"
  | "buy"
  | "teams"
  | "users"
  | "buyers"
  | "cards"
  | "capture"
  | "analytics"
  | "settings";

export interface NavLink {
  href: string;
  label: string;
  icon: IconId;
  /** Section this item belongs to; consecutive items share a group header. */
  group: string;
}

const ICONS: Record<IconId, LucideIcon> = {
  dashboard: LayoutDashboard,
  subscriptions: Repeat,
  purchases: ReceiptText,
  requests: Inbox,
  cancellations: Ban,
  review: ClipboardCheck,
  buy: ShoppingCart,
  teams: UsersRound,
  users: Users,
  buyers: Wallet,
  cards: CreditCard,
  capture: ScanLine,
  analytics: BarChart3,
  settings: Settings,
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  team_lead: "Team lead",
  buyer: "Buyer",
};

/** Preserve item order while collapsing consecutive items into their groups. */
function groupItems(items: NavLink[]): { group: string; items: NavLink[] }[] {
  const groups: { group: string; items: NavLink[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }
  return groups;
}

export function AppSideNav({
  role,
  items,
}: {
  role: UserRole;
  items: NavLink[];
}) {
  const pathname = usePathname();
  const home = homeFor(role);
  const groups = groupItems(items);

  return (
    <SideNav
      header={
        <SideNavHeading
          heading="Subscription Manager"
          superheading="sandbox"
          subheading={ROLE_LABEL[role]}
          headingHref={home}
        />
      }
      footer={
        <form action={signOut}>
          <Button label="Sign out" type="submit" variant="ghost" width="100%" />
        </form>
      }
    >
      {groups.map((g) => (
        <SideNavSection key={g.group} title={g.group}>
          {g.items.map((item) => {
            // lucide's forward-ref components are structurally SVG icon
            // components; cast to Astryx's IconType (which also resolves React
            // types from its own copy) to bridge the two @types/react trees.
            const icon = ICONS[item.icon] as unknown as IconType;
            return (
              <SideNavItem
                key={item.href}
                as={Link}
                href={item.href}
                label={item.label}
                icon={icon}
                selectedIcon={icon}
                isSelected={pathname === item.href}
              />
            );
          })}
        </SideNavSection>
      ))}
    </SideNav>
  );
}
