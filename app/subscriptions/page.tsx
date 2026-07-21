// Thin route — the subscriptions TABLE page. Filters arrive as search params
// and are applied in the database by getSubscriptions.
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { LinkButton } from "@/components/LinkButton";
import { getSessionUser } from "@/lib/supabase/auth";
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
  const session = await getSessionUser();

  // Team scoping is server-enforced (not a user-facing filter): a team lead
  // only ever sees their own team's rows.
  if (session?.role === "team_lead" && session.teamId === null) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Subscriptions</Heading>
        <Card padding={5}>
          <Text type="supporting">
            You haven&apos;t been assigned to a team yet — ask an admin.
          </Text>
        </Card>
      </div>
    );
  }

  const teamId =
    session?.role === "team_lead" ? (session.teamId ?? undefined) : undefined;

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
      teamId,
    }),
    getTags(teamId),
  ]);

  return (
    <div className="space-y-6">
      <Heading level={1}>Subscriptions</Heading>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar tags={tags} />
        <div className="flex items-center gap-2">
          {session?.role === "admin" && <SyncCardsButton />}
          <LinkButton
            href="/subscriptions/new"
            variant="primary"
            label="Add subscription"
          />
        </div>
      </div>

      <SubscriptionTable rows={rows} />

      <Text type="supporting">
        {rows.length} subscription{rows.length === 1 ? "" : "s"}
      </Text>
    </div>
  );
}
