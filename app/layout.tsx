import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSessionUser } from "@/lib/supabase/auth";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Subscription Manager",
  description: "In-house subscription tracking verified against Mercury",
};

// Shared pages both roles see (team leads get a team-scoped view of each).
const baseNav = [
  { href: "/", label: "Dashboard" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/requests", label: "Requests" },
  { href: "/review", label: "Review" },
];
// Admin-only pages.
const adminNav = [
  { href: "/teams", label: "Teams" },
  { href: "/analytics", label: "Analytics" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionUser();
  const nav = session
    ? session.role === "admin"
      ? [...baseNav, ...adminNav]
      : baseNav
    : [];

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b bg-card">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
            <Link href={session ? "/" : "/request"} className="font-semibold tracking-tight">
              Subscription Manager
            </Link>
            {session ? (
              <nav className="flex gap-4 text-sm text-muted-foreground">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            ) : null}
            <span className="ml-auto text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              sandbox
            </span>
            {session ? (
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {session.role === "admin" ? "Admin" : "Team lead"}
                </Badge>
                <form action={signOut}>
                  <Button variant="ghost" size="sm" type="submit">
                    Sign out
                  </Button>
                </form>
              </div>
            ) : null}
          </div>
        </header>
        <main className="mx-auto max-w-6xl w-full px-4 py-8 flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
