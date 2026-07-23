// Brand theme — the app's visual identity. Extends the restrained neutral base
// (kept for a professional, content-first finance tool) and layers on a
// distinct indigo accent, a cool neutral cast, and slightly softer corners so
// the app reads as designed rather than default.
//
// Built to CSS for SSR/first-paint via:
//   npx astryx theme build lib/theme/brand.theme.ts -o app/brand-theme.css
// Pair the emitted `brandTheme` object with that CSS in app/providers.tsx +
// app/globals.css (same pattern the neutral /built theme used).
import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

export const brandTheme = defineTheme({
  name: "brand",
  extends: neutralTheme,
  color: { accent: "#4F46E5", neutralStyle: "cool" },
  radius: { base: 6, multiplier: 1 },
  tokens: {
    // Explicit light/dark accent pair — a touch brighter in dark mode so the
    // indigo keeps its presence on the darker cool-gray surfaces.
    "--color-accent": ["#4F46E5", "#7C74F2"],
  },
  components: {
    // Uniform breathing room in every table cell across the app.
    "table-cell": { base: { padding: "12px 16px" } },
    "table-header-cell": { base: { padding: "12px 16px" } },
  },
});

export default brandTheme;
