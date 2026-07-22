import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public surface: login, the open request form, cron (Bearer-secret) and dev
// seed (disabled in prod builds). Everything else — including /api/sync/* and
// /api/mercury/* — requires an admin or team-lead session.
type Role = "admin" | "team_lead" | "buyer";

const PUBLIC_PAGES = [
  "/login",
  "/subscription-request",
  "/cancellation-request",
];
const PUBLIC_API_PREFIXES = ["/api/cron/", "/api/dev/"];
// Admin-only pages: everyone else is redirected to their own home.
const ADMIN_ONLY_PREFIXES = [
  "/teams",
  "/users",
  "/buyers",
  "/cards",
  "/capture",
  "/analytics",
  "/settings",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return true;
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

function hit(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** Where each role lands when bounced from a page they can't see. */
function homeFor(role: Role): string {
  return role === "buyer" ? "/buy" : "/";
}

/**
 * Page-level authorization by role. Admins see everything. The purchasing
 * surfaces (`/buy` and the create-subscription form) belong to admins + buyers;
 * everything else (dashboard, requests, review) belongs to admins + team leads.
 * Buyers are confined to the buy queue, the create form, and /subscriptions
 * (their own purchases). Not a security boundary on its own — pages/actions
 * re-check — just the routing that keeps each role in its lane.
 */
function isAllowed(pathname: string, role: Role): boolean {
  if (role === "admin") return true;
  if (ADMIN_ONLY_PREFIXES.some((p) => hit(pathname, p))) return false;

  const isCreateForm = pathname === "/subscriptions/new";
  const inBuyQueue = hit(pathname, "/buy");

  if (role === "buyer") {
    // Buyers: the to-buy queue, the create form, the subscriptions list, and
    // the cancellations queue they finalize.
    return (
      inBuyQueue ||
      isCreateForm ||
      hit(pathname, "/subscriptions") ||
      hit(pathname, "/cancellations")
    );
  }
  // team_lead: everything except the buyer-owned surfaces.
  return !inBuyQueue && !isCreateForm;
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

  // Gate 2: role-gated pages — bounce to the role's own home. (Pages/actions
  // re-check; this just keeps each role in its lane.)
  if (isAuthed && role && !isPublic(pathname) && !isAllowed(pathname, role)) {
    const url = request.nextUrl.clone();
    url.pathname = homeFor(role);
    url.search = "";
    return redirectWithCookies(url);
  }

  // Already signed in → keep users off the login page.
  if (pathname === "/login" && isAuthed && role) {
    const url = request.nextUrl.clone();
    url.pathname = homeFor(role);
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
