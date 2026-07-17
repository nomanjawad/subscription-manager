import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getAdminUser } from "@/lib/supabase/auth";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

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

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/requests", label: "Requests" },
  { href: "/review", label: "Review" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await getAdminUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b bg-card">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
            <Link href={admin ? "/" : "/request"} className="font-semibold tracking-tight">
              Subscription Manager
            </Link>
            {admin ? (
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
            {admin ? (
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
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
