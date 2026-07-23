// Thin route — mounts m05-review.
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { PageHeader } from "@/components/PageHeader";
import { getSessionUser } from "@/lib/supabase/auth";
import ReviewQueue from "@/modules/m05-review/ReviewQueue";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const session = await getSessionUser();

  // Team scoping is server-enforced: a team lead only sees their team's items.
  if (session?.role === "team_lead" && session.teamId === null) {
    return (
      <VStack gap={6} maxWidth={896} className="mx-auto w-full">
        <PageHeader title="Review queue" />
        <Card padding={5}>
          <Text type="supporting">
            You haven&apos;t been assigned to a team yet — ask an admin.
          </Text>
        </Card>
      </VStack>
    );
  }

  const isAdmin = session?.role === "admin";
  const teamId =
    session?.role === "team_lead" ? (session.teamId ?? undefined) : undefined;

  return (
    <VStack gap={6} maxWidth={896} className="mx-auto w-full">
      <PageHeader
        title="Review queue"
        subtitle="Renewals flagged for a closer look before they're confirmed against Mercury."
      />
      <ReviewQueue teamId={teamId} isAdmin={isAdmin} />
    </VStack>
  );
}
