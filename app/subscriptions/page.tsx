// Thin route — the subscriptions TABLE page. Filters arrive as search params
// and are applied in the database by getSubscriptions.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SyncCardsButton } from "@/modules/m01-cards/SyncCardsButton";
import { FilterBar } from "@/modules/m02-subscriptions/FilterBar";
import { SubscriptionTable } from "@/modules/m02-subscriptions/SubscriptionTable";
import {
  getSubscriptions,
  getTags,
} from "@/modules/m02-subscriptions/queries";

export const dynamic = "force-dynamic";

interface SubscriptionsSearchParams {
  tag?: string | string[];
  status?: string | string[];
  cycle?: string | string[];
  q?: string | string[];
}

/** Next delivers repeated params as arrays — only accept a single value. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SubscriptionsSearchParams>;
}) {
  const params = await searchParams;

  const status =
    params.status === "active" || params.status === "cancelled"
      ? params.status
      : undefined;
  const cycle =
    params.cycle === "monthly" || params.cycle === "yearly"
      ? params.cycle
      : undefined;

  const [rows, tags] = await Promise.all([
    getSubscriptions({
      tag: single(params.tag),
      status,
      cycle,
      q: single(params.q),
    }),
    getTags(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar tags={tags} />
        <div className="flex items-center gap-2">
          <SyncCardsButton />
          <Button asChild>
            <Link href="/subscriptions/new">Add subscription</Link>
          </Button>
        </div>
      </div>

      <SubscriptionTable rows={rows} />

      <p className="text-sm text-muted-foreground">
        {rows.length} subscription{rows.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
