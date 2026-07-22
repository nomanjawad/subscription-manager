import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  PREFIX_FOR_ROLE,
  homeFor,
  isSectionAllowed,
} from "@/lib/roles";

// Public surface: login, the open request/cancellation forms, cron
// (Bearer-secret) and dev seed. Every authenticated page lives under a role
// prefix (/admin, /teamlead, /buyer); this proxy keeps each role in its own
// URL space. Not the only guard — pages/actions re-check — just the routing.
type Role = "admin" | "team_lead" | "buyer";

const PUBLIC_PAGES = [
  "/login",
  "/subscription-request",
  "/cancellation-request",
];
const PUBLIC_API_PREFIXES = ["/api/cron/", "/api/dev/"];

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

  // Refresh the session and identify the user (never trust getSession here).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // Resolve role from the JWT (app_metadata), with the ADMIN_EMAILS bootstrap.
  // Mirrors lib/supabase/auth.ts:resolveRole — kept DB-free for the edge.
  const email = user?.email?.toLowerCase() ?? null;
  const metaRole = user?.app_metadata?.role;
  let role: Role | null = null;
  if (metaRole === "admin" || metaRole === "team_lead" || metaRole === "buyer")
    role = metaRole;
  else if (email && allowlist.includes(email)) role = "admin";

  const isAuthed = role !== null;
  const { pathname } = request.nextUrl;

  // Any redirect must carry over cookies written during getUser() (refresh
  // token rotation) — otherwise the browser keeps a stale token.
  function redirectTo(path: string): NextResponse {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  // ── Public pages ────────────────────────────────────────────────────────
  if (isPublicPage(pathname)) {
    // Signed-in users shouldn't sit on the login page.
    if (pathname === "/login" && isAuthed && role) {
      return redirectTo(homeFor(role));
    }
    return response;
  }
  if (isPublicApi(pathname)) return response;

  // ── Everything else requires a session ───────────────────────────────────
  if (!isAuthed || !role) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
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
