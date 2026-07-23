"use client";

// Astryx theme provider. Uses the pre-built brand theme object (indigo accent
// over a cool neutral base — see lib/theme/brand.theme.ts) paired with
// brand-theme.css imported in globals.css, for SSR/first-paint performance, and
// follows the OS light/dark preference.
import { Theme } from "@astryxdesign/core/theme";
import { brandTheme } from "@/lib/theme/brand";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme={brandTheme} mode="system">
      {children}
    </Theme>
  );
}
