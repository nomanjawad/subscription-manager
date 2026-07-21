"use client";

// Astryx theme provider. Uses the pre-built neutral theme object (paired with
// theme.css imported in globals.css) for SSR/first-paint performance, and
// follows the OS light/dark preference.
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme={neutralTheme} mode="system">
      {children}
    </Theme>
  );
}
