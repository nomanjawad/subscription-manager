// Session policy — pure and dependency-free so proxy.ts (edge) and the server
// session helpers apply exactly the same rules:
//   1. The session must have started with Google sign-in (an "oauth" entry in
//      the JWT's amr). Password or magic-link sessions are rejected even if
//      the auth server would issue one.
//   2. Hard limit: 30 minutes from that sign-in, regardless of activity.
//      Token refreshes don't extend it — amr keeps the original timestamp.
//   3. Two-factor (TOTP) is mandatory: the session must be aal2. A user with
//      no verified authenticator is sent to enroll one; a user with one is
//      sent to enter a code.

export const SESSION_MAX_AGE_SECONDS = 30 * 60;

export type SessionGate =
  | { kind: "ok"; expiresAt: number }
  | { kind: "mfa_verify"; expiresAt: number }
  | { kind: "mfa_enroll"; expiresAt: number }
  | { kind: "expired" }
  | { kind: "invalid" };

export interface AssuranceInfo {
  currentLevel: string | null;
  nextLevel: string | null;
  /** amr entries. Supabase sends { method, timestamp (unix seconds) }; bare
   *  method strings carry no timestamp and can't satisfy the time limit. */
  methods: ReadonlyArray<unknown>;
}

/** Unix seconds when the Google sign-in happened, or null if there was none. */
export function oauthSignInAt(methods: AssuranceInfo["methods"]): number | null {
  const times = methods
    .filter(
      (m): m is { method: string; timestamp: number } =>
        typeof m === "object" &&
        m !== null &&
        (m as { method?: unknown }).method === "oauth" &&
        Number.isFinite((m as { timestamp?: unknown }).timestamp),
    )
    .map((m) => m.timestamp);
  return times.length > 0 ? Math.min(...times) : null;
}

export function sessionGate(
  info: AssuranceInfo,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): SessionGate {
  const signedInAt = oauthSignInAt(info.methods);
  if (signedInAt === null) return { kind: "invalid" };

  const expiresAt = signedInAt + SESSION_MAX_AGE_SECONDS;
  if (nowSeconds >= expiresAt) return { kind: "expired" };

  if (info.currentLevel === "aal2") return { kind: "ok", expiresAt };
  if (info.nextLevel === "aal2") return { kind: "mfa_verify", expiresAt };
  return { kind: "mfa_enroll", expiresAt };
}
