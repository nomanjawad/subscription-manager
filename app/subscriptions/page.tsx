// Thin route — the subscriptions TABLE page. Filters arrive as search params
// and are applied in the database by getSubscriptions.
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { LinkButton } from "@/components/LinkButton";
import { getSessionUser } from "@/lib/supabase/auth";
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
  // Buyers only ever see the subscriptions they themselves bought.
  const isBuyer = session?.role === "buyer";
  const purchasedBy = isBuyer ? session.id : undefined;
  const canCreate = session?.role === "admin" || isBuyer;
  // Buyers get a read-only view of their purchases; admins/leads can manage rows.
  const canManage =
    session?.role === "admin" || session?.role === "team_lead";
  const heading = isBuyer ? "My purchases" : "Subscriptions";

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
      purchasedBy,
    }),
    getTags(teamId),
  ]);

  return (
    <div className="space-y-6">
      <Heading level={1}>{heading}</Heading>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar tags={tags} />
        {canCreate ? (
          <div className="flex items-center gap-2">
            <LinkButton
              href="/subscriptions/new"
              variant="primary"
              label="Add subscription"
            />
          </div>
        ) : null}
      </div>

      <SubscriptionTable rows={rows} canManage={canManage} />

      <Text type="supporting">
        {rows.length} subscription{rows.length === 1 ? "" : "s"}
      </Text>
    </div>
  );
}
