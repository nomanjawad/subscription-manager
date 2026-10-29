// Subscription report download: GET ?format=csv|xlsx plus the same filter
// params as the subscriptions page. Rows are scoped to the signed-in role
// (team lead → own team, buyer → own purchases) exactly like the page.
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/supabase/auth";
import {
  getSubscriptions,
  parseSubscriptionFilters,
  subscriptionScope,
} from "@/modules/m02-subscriptions/queries";
import {
  subscriptionsToCsv,
  subscriptionsToXlsx,
} from "@/modules/m02-subscriptions/export";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const search = request.nextUrl.searchParams;
  const format = search.get("format") === "xlsx" ? "xlsx" : "csv";

  const scope = subscriptionScope(session);
  const params = Object.fromEntries(search.entries());
  const rows = scope
    ? await getSubscriptions({ ...parseSubscriptionFilters(params), ...scope })
    : [];

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `subscriptions-${stamp}.${format}`;
  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };

  if (format === "xlsx") {
    const body = await subscriptionsToXlsx(rows);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        ...headers,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  }

  return new NextResponse(subscriptionsToCsv(rows), {
    headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
  });
}
