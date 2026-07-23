// Thin route — the subscriptions TABLE page. Filters arrive as search params
// and are applied in the database by getSubscriptions.
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { LinkButton } from "@/components/LinkButton";
import { getSessionUser } from "@/lib/supabase/auth";
import { rolePath } from "@/lib/roles";
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
  if (!session) return null; // the [role] layout has already guarded this

  const newHref = rolePath(session.role, "subscriptions/new");

  // Team scoping is server-enforced (not a user-facing filter): a team lead
  // only ever sees their own team's rows.
  if (session.role === "team_lead" && session.teamId === null) {
    return (
      <PageBody>
        <PageHeader title="Subscriptions" />
        <Card padding={5}>
          <Text type="supporting">
            You haven&apos;t been assigned to a team yet — ask an admin.
          </Text>
        </Card>
      </PageBody>
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
    <PageBody>
      <PageHeader
        title={heading}
        subtitle={`${rows.length} subscription${rows.length === 1 ? "" : "s"}`}
        actions={
          canCreate ? (
            <LinkButton
              href={newHref}
              variant="primary"
              label="Add subscription"
            />
          ) : undefined
        }
      />

      <FilterBar tags={tags} />

      <SubscriptionTable
        rows={rows}
        canManage={canManage}
        newBasePath={newHref}
      />
    </PageBody>
  );
}
