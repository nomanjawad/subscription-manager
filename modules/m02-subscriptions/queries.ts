// m02-subscriptions — read queries against the subscription_overview view
// (the sanctioned cross-table read; no JS joins).
import { createServiceClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/supabase/auth";
import type { SubscriptionOverviewRow } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface SubscriptionFilters {
  tag?: string;
  status?: "active" | "cancelled";
  cycle?: "monthly" | "yearly";
  q?: string;
  /** Card (cards.id) the subscription is charged to. */
  cardId?: string;
  /** Inclusive start_date range, YYYY-MM-DD. */
  startFrom?: string;
  startTo?: string;
  /** Team scope. Server-enforced (not a user-facing filter). */
  teamId?: string;
  /** Buyer scope: only subscriptions this profile bought. Server-enforced. */
  purchasedBy?: string;
}

export type FilterParams = Record<string, string | string[] | undefined>;

/** Next delivers repeated params as arrays — only accept a single value. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function isoDate(value: string | string[] | undefined): string | undefined {
  const v = single(value);
  return v && DATE_RE.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
}

/**
 * The user-facing filters from URL search params, validated. Shared by the
 * subscriptions page and the export route so a download always matches the
 * rows on screen.
 */
export function parseSubscriptionFilters(
  params: FilterParams,
): SubscriptionFilters {
  const card = single(params.card);
  return {
    tag: single(params.tag),
    status:
      params.status === "active" || params.status === "cancelled"
        ? params.status
        : undefined,
    cycle:
      params.cycle === "monthly" || params.cycle === "yearly"
        ? params.cycle
        : undefined,
    q: single(params.q),
    cardId: card && UUID_RE.test(card) ? card : undefined,
    startFrom: isoDate(params.from),
    startTo: isoDate(params.to),
  };
}

/**
 * Server-enforced row scope for a session: team leads see their team, buyers
 * see what they bought, admins see everything. Null when a team lead has no
 * team yet (nothing to show).
 */
export function subscriptionScope(
  session: SessionUser,
): Pick<SubscriptionFilters, "teamId" | "purchasedBy"> | null {
  if (session.role === "team_lead") {
    return session.teamId ? { teamId: session.teamId } : null;
  }
  if (session.role === "buyer") return { purchasedBy: session.id };
  return {};
}

/**
 * Filtered subscription list. Every filter is applied in the database
 * (eq/ilike on subscription_overview) — never as a JS array filter.
 */
export async function getSubscriptions(
  filters: SubscriptionFilters = {},
): Promise<SubscriptionOverviewRow[]> {
  const supabase = createServiceClient();
  let query = supabase.from("subscription_overview").select("*");

  if (filters.teamId) query = query.eq("team_id", filters.teamId);
  if (filters.purchasedBy) query = query.eq("purchased_by", filters.purchasedBy);
  if (filters.tag) query = query.eq("tag", filters.tag);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.cycle) query = query.eq("billing_cycle", filters.cycle);
  if (filters.cardId) query = query.eq("card_id", filters.cardId);
  if (filters.startFrom) query = query.gte("start_date", filters.startFrom);
  if (filters.startTo) query = query.lte("start_date", filters.startTo);
  if (filters.q) {
    // PostgREST or() values are delimited by commas/parens and may be quoted,
    // and ilike patterns use % wildcards and \ escapes — strip all of them so
    // user input can neither break the filter grammar nor the pattern.
    const q = filters.q.replace(/[%,()"\\]/g, "").trim();
    if (q !== "") {
      query = query.or(`platform.ilike.%${q}%,product.ilike.%${q}%`);
    }
  }

  const { data, error } = await query.order("next_renewal_date", {
    ascending: true,
  });

  if (error) {
    throw new Error(`Failed to load subscriptions: ${error.message}`);
  }
  return (data ?? []) as SubscriptionOverviewRow[];
}

/** Distinct tags (for the filter dropdown + form datalist). */
export async function getTags(teamId?: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc(
    "subscription_tags",
    teamId ? { p_team_id: teamId } : {},
  );

  if (error) {
    throw new Error(`Failed to load tags: ${error.message}`);
  }
  return ((data ?? []) as { tag: string }[]).map((row) => row.tag);
}

/** One subscription (with card + last-check context) for the edit form. */
export async function getSubscriptionOverview(
  id: string,
): Promise<SubscriptionOverviewRow | null> {
  if (!UUID_RE.test(id)) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subscription_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load subscription: ${error.message}`);
  }
  return (data as SubscriptionOverviewRow | null) ?? null;
}
