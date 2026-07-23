import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@astryxdesign/core/AppShell";
import { getSessionUser } from "@/lib/supabase/auth";
import { rolePath } from "@/lib/roles";
import type { UserRole } from "@/lib/types";
import { Providers } from "./providers";
import { AppSideNav, type NavLink, type IconId } from "./AppSideNav";

export const metadata: Metadata = {
  title: "Subscription Manager",
  description: "In-house subscription tracking verified against Mercury",
};

interface NavSection {
  section: string; // relative to the role prefix; "" is the role's home
  label: string;
  icon: IconId;
  group: string; // titled sidebar section this item lives under
}

// Sections per role. Keep in sync with lib/roles.ts ALLOWED_SECTIONS and the
// IconId union in app/AppSideNav.tsx.
const SECTIONS: Record<UserRole, NavSection[]> = {
  admin: [
    { section: "", label: "Dashboard", icon: "dashboard", group: "Overview" },
    { section: "subscriptions", label: "Subscriptions", icon: "subscriptions", group: "Operations" },
    { section: "requests", label: "Requests", icon: "requests", group: "Operations" },
    { section: "cancellations", label: "Cancellations", icon: "cancellations", group: "Operations" },
    { section: "review", label: "Review", icon: "review", group: "Operations" },
    { section: "buy", label: "To buy", icon: "buy", group: "Operations" },
    { section: "teams", label: "Teams", icon: "teams", group: "Administration" },
    { section: "users", label: "Users", icon: "users", group: "Administration" },
    { section: "buyers", label: "Buyers", icon: "buyers", group: "Administration" },
    { section: "cards", label: "Cards", icon: "cards", group: "Administration" },
    { section: "capture", label: "Capture", icon: "capture", group: "Administration" },
    { section: "analytics", label: "Analytics", icon: "analytics", group: "Administration" },
    { section: "settings", label: "Settings", icon: "settings", group: "Administration" },
  ],
  team_lead: [
    { section: "", label: "Dashboard", icon: "dashboard", group: "Overview" },
    { section: "subscriptions", label: "Subscriptions", icon: "subscriptions", group: "Operations" },
    { section: "requests", label: "Requests", icon: "requests", group: "Operations" },
    { section: "cancellations", label: "Cancellations", icon: "cancellations", group: "Operations" },
    { section: "review", label: "Review", icon: "review", group: "Operations" },
  ],
  buyer: [
    { section: "", label: "To buy", icon: "buy", group: "Workspace" },
    { section: "subscriptions", label: "My purchases", icon: "purchases", group: "Workspace" },
    { section: "cancellations", label: "Cancellations", icon: "cancellations", group: "Workspace" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionUser();
  const items: NavLink[] = session
    ? SECTIONS[session.role].map((s) => ({
        href: rolePath(session.role, s.section),
        label: s.label,
        icon: s.icon,
        group: s.group,
      }))
    : [];

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell
            contentPadding={0}
            sideNav={
              session ? (
                <AppSideNav role={session.role} items={items} />
              ) : undefined
            }
          >
            <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
