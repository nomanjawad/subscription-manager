// Thin route — mounts the m06-dashboard module.
import Dashboard from "@/modules/m06-dashboard/Dashboard";
import { getSessionUser } from "@/lib/supabase/auth";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

// The dashboard reads live DB state (RPCs) and is refreshed by the cron
// route / sync APIs, which can't revalidate paths — render it per request
// like /review, instead of baking build-time data into a static page.
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ card?: string }>;
}) {
  // Middleware guarantees an authenticated, role-resolved session on this route.
  const session = await getSessionUser();
  const isTeamLead = session?.role === "team_lead";
  const { card } = await searchParams;
  const cardFilter = typeof card === "string" && card !== "" ? card : undefined;

  // Team lead with no team assigned — nothing to aggregate yet.
  if (isTeamLead && !session?.teamId) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Dashboard</Heading>
        <Card padding={5}>
          <Text type="supporting">
            You haven&apos;t been assigned to a team yet — ask an admin to add
            you to a team.
          </Text>
        </Card>
      </div>
    );
  }

  const subtitle = isTeamLead
    ? "your team's subscriptions · verified against Mercury · sandbox"
    : "verified against Mercury · sandbox";

  return (
    <div className="space-y-6">
      <VStack gap={1}>
        <Heading level={1}>Dashboard</Heading>
        <Text type="supporting">{subtitle}</Text>
      </VStack>
      {isTeamLead ? (
        <Dashboard teamId={session!.teamId!} />
      ) : (
        <Dashboard isAdmin cardFilter={cardFilter} />
      )}
    </div>
  );
}
