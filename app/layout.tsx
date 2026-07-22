import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@astryxdesign/core/AppShell";
import { getSessionUser } from "@/lib/supabase/auth";
import { rolePath } from "@/lib/roles";
import type { UserRole } from "@/lib/types";
import { Providers } from "./providers";
import { AppSideNav, type NavLink } from "./AppSideNav";

export const metadata: Metadata = {
  title: "Subscription Manager",
  description: "In-house subscription tracking verified against Mercury",
};

interface NavSection {
  section: string; // relative to the role prefix; "" is the role's home
  label: string;
}

// Sections per role. Keep in sync with lib/roles.ts ALLOWED_SECTIONS.
const SECTIONS: Record<UserRole, NavSection[]> = {
  admin: [
    { section: "", label: "Dashboard" },
    { section: "subscriptions", label: "Subscriptions" },
    { section: "requests", label: "Requests" },
    { section: "cancellations", label: "Cancellations" },
    { section: "review", label: "Review" },
    { section: "buy", label: "To buy" },
    { section: "teams", label: "Teams" },
    { section: "users", label: "Users" },
    { section: "buyers", label: "Buyers" },
    { section: "cards", label: "Cards" },
    { section: "capture", label: "Capture" },
    { section: "analytics", label: "Analytics" },
    { section: "settings", label: "Settings" },
  ],
  team_lead: [
    { section: "", label: "Dashboard" },
    { section: "subscriptions", label: "Subscriptions" },
    { section: "requests", label: "Requests" },
    { section: "cancellations", label: "Cancellations" },
    { section: "review", label: "Review" },
  ],
  buyer: [
    { section: "", label: "To buy" },
    { section: "subscriptions", label: "My purchases" },
    { section: "cancellations", label: "Cancellations" },
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
