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
import { signOut } from "@/lib/auth/actions";

export interface NavLink {
  href: string;
  label: string;
  icon?: string;
}

export function AppSideNav({
  role,
  items,
}: {
  role: "admin" | "team_lead";
  items: NavLink[];
}) {
  const pathname = usePathname();
  return (
    <SideNav
      header={
        <SideNavHeading
          heading="Subscription Manager"
          superheading="sandbox"
          subheading={role === "admin" ? "Admin" : "Team lead"}
          headingHref="/"
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
