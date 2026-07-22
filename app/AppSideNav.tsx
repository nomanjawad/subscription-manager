"use client";

// App sidebar (Astryx SideNav). Role-aware items; current route highlighted
// via usePathname. Sign-out posts the existing server action.
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SideNav,
  SideNavItem,
  SideNavHeading,
} from "@astryxdesign/core/SideNav";
import { Button } from "@astryxdesign/core/Button";
import type { UserRole } from "@/lib/types";
import { homeFor } from "@/lib/roles";
import { signOut } from "@/lib/auth/actions";

export interface NavLink {
  href: string;
  label: string;
  icon?: string;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  team_lead: "Team lead",
  buyer: "Buyer",
};

export function AppSideNav({
  role,
  items,
}: {
  role: UserRole;
  items: NavLink[];
}) {
  const pathname = usePathname();
  const home = homeFor(role);
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
          <Button
            label="Sign out"
            type="submit"
            variant="ghost"
            width="100%"
          />
        </form>
      }
    >
      {items.map((item) => (
        <SideNavItem
          key={item.href}
          as={Link}
          href={item.href}
          label={item.label}
          icon={item.icon}
          isSelected={pathname === item.href}
        />
      ))}
    </SideNav>
  );
}
