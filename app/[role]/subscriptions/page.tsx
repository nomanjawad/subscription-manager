// Thin route — the subscriptions TABLE page. Filters arrive as search params
// and are applied in the database by getSubscriptions.
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { LinkButton } from "@/components/LinkButton";
import { getSessionUser } from "@/lib/supabase/auth";
import { rolePath } from "@/lib/roles";
import { FilterBar } from "@/modules/m02-subscriptions/FilterBar";
import { ExportMenu } from "@/modules/m02-subscriptions/ExportMenu";
import { SubscriptionTable } from "@/modules/m02-subscriptions/SubscriptionTable";
import {
  getSubscriptions,
  getTags,
  parseSubscriptionFilters,
  subscriptionScope,
  type FilterParams,
} from "@/modules/m02-subscriptions/queries";
import { getCardOptions } from "@/modules/m01-cards/queries";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>;
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

  const scope = subscriptionScope(session) ?? {};
  const teamId = scope.teamId;
  const isBuyer = session.role === "buyer";
  const canCreate = session.role === "admin" || isBuyer;
  // Buyers get a read-only view of their purchases; admins/leads can manage rows.
  const canManage = session.role === "admin" || session.role === "team_lead";
  const heading = isBuyer ? "My purchases" : "Subscriptions";

  const [rows, tags, cards] = await Promise.all([
    getSubscriptions({ ...parseSubscriptionFilters(params), ...scope }),
    getTags(teamId),
    getCardOptions(teamId),
  ]);

  const cardOptions = cards.map((c) => ({
    value: c.id,
    label: `${c.nickname ?? c.name_on_card ?? "Card"} ••${c.last4}`,
  }));

  return (
    <PageBody>
      <PageHeader
        title={heading}
        subtitle={`${rows.length} subscription${rows.length === 1 ? "" : "s"}`}
        actions={
          <>
            <ExportMenu />
            {canCreate ? (
              <LinkButton
                href={newHref}
                variant="primary"
                label="Add subscription"
              />
            ) : null}
          </>
        }
      />

      <FilterBar tags={tags} cards={cardOptions} />

      <SubscriptionTable
        rows={rows}
        canManage={canManage}
        newBasePath={newHref}
      />
    </PageBody>
  );
}
