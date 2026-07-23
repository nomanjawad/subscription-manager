// Role home. Buyer → the To-buy queue; admin / team lead → the dashboard.
import Dashboard from "@/modules/m06-dashboard/Dashboard";
import { BuyView } from "@/modules/m07-requests/BuyView";
import { getSessionUser } from "@/lib/supabase/auth";
import { rolePath } from "@/lib/roles";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { PageHeader, PageBody } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function RoleHome({
  searchParams,
}: {
  searchParams: Promise<{ card?: string }>;
}) {
  // The [role] layout has already ensured a session whose role matches the URL.
  const session = await getSessionUser();
  if (!session) return null;

  if (session.role === "buyer") {
    return <BuyView addHref={rolePath("buyer", "subscriptions/new")} />;
  }

  const isTeamLead = session.role === "team_lead";
  const { card } = await searchParams;
  const cardFilter = typeof card === "string" && card !== "" ? card : undefined;
  const basePath = rolePath(session.role);

  // Team lead with no team assigned — nothing to aggregate yet.
  if (isTeamLead && !session.teamId) {
    return (
      <PageBody>
        <PageHeader title="Dashboard" />
        <Card padding={5}>
          <Text type="supporting">
            You haven&apos;t been assigned to a team yet — ask an admin to add
            you to a team.
          </Text>
        </Card>
      </PageBody>
    );
  }

  const subtitle = isTeamLead
    ? "your team's subscriptions · verified against Mercury · sandbox"
    : "verified against Mercury · sandbox";

  return (
    <PageBody>
      <PageHeader title="Dashboard" subtitle={subtitle} />
      {isTeamLead ? (
        <Dashboard teamId={session.teamId!} basePath={basePath} />
      ) : (
        <Dashboard isAdmin cardFilter={cardFilter} basePath={basePath} />
      )}
    </PageBody>
  );
}
