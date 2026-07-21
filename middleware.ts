import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public surface: login, the open request form, cron (Bearer-secret) and dev
// seed (disabled in prod builds). Everything else — including /api/sync/* and
// /api/mercury/* — requires an admin or team-lead session.
const PUBLIC_PAGES = ["/login", "/request"];
const PUBLIC_API_PREFIXES = ["/api/cron/", "/api/dev/"];
// Admin-only pages: team leads are redirected to their dashboard.
const ADMIN_ONLY_PREFIXES = ["/teams", "/analytics"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return true;
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

function isAdminOnly(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function middleware(request: NextRequest) {
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
  let role: "admin" | "team_lead" | null = null;
  if (metaRole === "admin" || metaRole === "team_lead") role = metaRole;
  else if (email && allowlist.includes(email)) role = "admin";

  const isAuthed = role !== null;
  const isAdmin = role === "admin";

  const { pathname } = request.nextUrl;

  // Any redirect must carry over cookies written during getUser() (refresh
  // token rotation) — otherwise the browser keeps a stale, already-rotated
  // token and the session dies on the next request.
  function redirectWithCookies(url: URL): NextResponse {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  // Gate 1: any non-public route requires an authenticated (admin/team_lead) session.
  if (!isPublic(pathname) && !isAuthed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return redirectWithCookies(url);
  }

  // Gate 2: admin-only pages — team leads get bounced to their dashboard.
  if (isAuthed && !isAdmin && isAdminOnly(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectWithCookies(url);
  }

  // Already signed in → keep users off the login page.
  if (pathname === "/login" && isAuthed) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectWithCookies(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
