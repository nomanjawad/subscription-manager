// Thin admin route — mounts the m07-requests panel. Middleware guards access.
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { getSessionUser } from "@/lib/supabase/auth";
import { rolePath } from "@/lib/roles";
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
  if (!session) return null; // guarded by the [role] layout
  const basePath = rolePath(session.role, "requests");

  // Team leads only ever see their own team's requests; an unassigned lead
  // can't see anything yet. Admins (teamId omitted) see everything.
  if (session.role === "team_lead") {
    if (!session.teamId) {
      return (
        <PageBody>
          <PageHeader title="Subscription requests" />
          <Card padding={5}>
            <Text type="supporting">
              You haven&apos;t been assigned to a team yet — ask an admin.
            </Text>
          </Card>
        </PageBody>
      );
    }
    return (
      <PageBody>
        <PageHeader
          title="Subscription requests"
          subtitle="Review incoming requests, approve or reject them, and hand approved ones to buyers."
        />
        <RequestsPanel tab={tab} teamId={session.teamId} basePath={basePath} />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title="Subscription requests"
        subtitle="Review incoming requests, approve or reject them, and hand approved ones to buyers."
      />
      <RequestsPanel tab={tab} basePath={basePath} />
    </PageBody>
  );
}
