import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@astryxdesign/core/AppShell";
import { getSessionUser } from "@/lib/supabase/auth";
import { Providers } from "./providers";
import { AppSideNav, type NavLink } from "./AppSideNav";

export const metadata: Metadata = {
  title: "Subscription Manager",
  description: "In-house subscription tracking verified against Mercury",
};

// Shared pages both roles see (team leads get a team-scoped view of each).
const baseNav: NavLink[] = [
  { href: "/", label: "Dashboard" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/requests", label: "Requests" },
  { href: "/review", label: "Review" },
];
// Admin-only pages.
const adminNav: NavLink[] = [
  { href: "/teams", label: "Teams" },
  { href: "/users", label: "Users" },
  { href: "/cards", label: "Cards" },
  { href: "/analytics", label: "Analytics" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionUser();
  const items = session
    ? session.role === "admin"
      ? [...baseNav, ...adminNav]
      : baseNav
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
