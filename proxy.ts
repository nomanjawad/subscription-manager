import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  PREFIX_FOR_ROLE,
  homeFor,
  isSectionAllowed,
} from "@/lib/roles";
import { sessionGate, type SessionGate } from "@/lib/auth/policy";

// Public surface: login, the open request/cancellation forms, the OAuth
// callback, cron (Bearer-secret) and dev seed. Every authenticated page lives
// under a role prefix (/admin, /teamlead, /buyer); this proxy keeps each role
// in its own URL space and enforces the session policy (lib/auth/policy.ts):
// Google sign-in + authenticator code, hard 30-minute limit. Not the only
// guard — pages/actions re-check via getSessionUser — just the routing.
type Role = "admin" | "team_lead" | "buyer";

const PUBLIC_PAGES = [
  "/login",
  "/subscription-request",
  "/cancellation-request",
];
const PUBLIC_API_PREFIXES = ["/api/cron/", "/api/dev/", "/auth/callback"];
const MFA_PAGE = "/login/mfa";

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session if needed and verify the JWT locally against the
  // project's ES256 signing keys (no auth-server round trip per request; never
  // trust getSession alone).
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ?? null;

  // Resolve role from the JWT (app_metadata), set when an admin adds the
  // account. Mirrors lib/supabase/auth.ts:resolveRole — kept DB-free for the edge.
  const metaRole = user?.app_metadata?.role;
  const role: Role | null =
    metaRole === "admin" || metaRole === "team_lead" || metaRole === "buyer"
      ? metaRole
      : null;

  const { pathname } = request.nextUrl;

  // Session policy: only evaluated for a user with a role.
  let gate: SessionGate | null = null;
  if (user && role) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    gate = data
      ? sessionGate({
          currentLevel: data.currentLevel,
          nextLevel: data.nextLevel,
          methods: data.currentAuthenticationMethods ?? [],
        })
      : { kind: "invalid" };
  }
  const isAuthed = gate?.kind === "ok";
  const needsMfa = gate?.kind === "mfa_verify" || gate?.kind === "mfa_enroll";
  const isDead = gate?.kind === "expired" || gate?.kind === "invalid";

  // Any redirect must carry over cookies written during getClaims() (refresh
  // token rotation) — otherwise the browser keeps a stale token.
  function redirectTo(path: string): NextResponse {
    // `path` may carry its own query (e.g. "/login?reason=expired").
    const redirect = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  // An expired (30 min) or non-Google session is ended right here; the
  // cleared auth cookies ride along on whatever response follows.
  if (isDead) {
    await supabase.auth.signOut({ scope: "local" });
  }

  if (isPublicApi(pathname)) return response;

  // ── Two-factor step: needs a Google session that isn't through MFA yet ────
  if (pathname === MFA_PAGE) {
    if (isAuthed && role) return redirectTo(homeFor(role));
    if (needsMfa) return response;
    return redirectTo(isDead ? "/login?reason=expired" : "/login");
  }

  // ── Public pages ────────────────────────────────────────────────────────
  if (isPublicPage(pathname)) {
    if (pathname === "/login") {
      // Signed-in users shouldn't sit on the login page.
      if (isAuthed && role) return redirectTo(homeFor(role));
      if (needsMfa) return redirectTo(MFA_PAGE);
    }
    return response;
  }

  // ── Everything else requires a full session ──────────────────────────────
  if (!isAuthed || !role) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (needsMfa) return redirectTo(MFA_PAGE);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    if (isDead) url.searchParams.set("reason", "expired");
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // Authed API (sync, mercury, …): allowed; handlers do their own checks.
  if (pathname.startsWith("/api/")) return response;

  // ── Role-prefixed page routing ────────────────────────────────────────────
  if (pathname === "/") return redirectTo(homeFor(role));

  const segments = pathname.split("/").filter(Boolean);
  const prefix = segments[0] ?? "";
  const section = segments[1] ?? "";

  // Must be inside your own role's space.
  if (prefix !== PREFIX_FOR_ROLE[role]) return redirectTo(homeFor(role));
  // …and a section your role is allowed to see.
  if (!isSectionAllowed(role, section)) return redirectTo(homeFor(role));

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
