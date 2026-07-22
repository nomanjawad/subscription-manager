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

// Shared pages admins + team leads see (team leads get a team-scoped view).
const baseNav: NavLink[] = [
  { href: "/", label: "Dashboard" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/requests", label: "Requests" },
  { href: "/cancellations", label: "Cancellations" },
  { href: "/review", label: "Review" },
];
// The purchasing queue — admins and buyers.
const buyNav: NavLink = { href: "/buy", label: "To buy" };
// Admin-only pages.
const adminNav: NavLink[] = [
  { href: "/teams", label: "Teams" },
  { href: "/users", label: "Users" },
  { href: "/buyers", label: "Buyers" },
  { href: "/cards", label: "Cards" },
  { href: "/capture", label: "Capture" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];
// A buyer's whole world: their to-buy queue and the subscriptions they bought.
const buyerNav: NavLink[] = [
  buyNav,
  { href: "/cancellations", label: "Cancellations" },
  { href: "/subscriptions", label: "My purchases" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionUser();
  const items = !session
    ? []
    : session.role === "admin"
      ? [...baseNav, buyNav, ...adminNav]
      : session.role === "buyer"
        ? buyerNav
        : baseNav; // team_lead

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
