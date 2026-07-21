// Thin admin route — mounts the m07-requests panel. Middleware guards access.
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { getSessionUser } from "@/lib/supabase/auth";
import { RequestsPanel } from "@/modules/m07-requests/RequestsPanel";

export const metadata = {
  title: "Subscription requests",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await getSessionUser();

  // Team leads only ever see their own team's requests; an unassigned lead
  // can't see anything yet. Admins (teamId omitted) see everything.
  if (session?.role === "team_lead") {
    if (!session.teamId) {
      return (
        <div className="space-y-8">
          <Heading level={1}>Subscription requests</Heading>
          <Card padding={5}>
            <Text type="supporting">
              You haven&apos;t been assigned to a team yet — ask an admin.
            </Text>
          </Card>
        </div>
      );
    }
    return (
      <div className="space-y-8">
        <Heading level={1}>Subscription requests</Heading>
        <RequestsPanel tab={tab} teamId={session.teamId} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Heading level={1}>Subscription requests</Heading>
      <RequestsPanel tab={tab} />
    </div>
  );
}
