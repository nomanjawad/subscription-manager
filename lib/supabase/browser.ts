// Browser Supabase client — AUTH ONLY (the two-factor step on /login/mfa).
// Uses the publishable key and the same cookies as the server client; data
// access stays on the server behind deny-all RLS.
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
