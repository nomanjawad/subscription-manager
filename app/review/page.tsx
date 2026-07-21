// Thin route — mounts m05-review.
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { getSessionUser } from "@/lib/supabase/auth";
import ReviewQueue from "@/modules/m05-review/ReviewQueue";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const session = await getSessionUser();

  // Team scoping is server-enforced: a team lead only sees their team's items.
  if (session?.role === "team_lead" && session.teamId === null) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Heading level={1}>Review queue</Heading>
        <Card padding={5}>
          <Text type="supporting">
            You haven&apos;t been assigned to a team yet — ask an admin.
          </Text>
        </Card>
      </div>
    );
  }

  const isAdmin = session?.role === "admin";
  const teamId =
    session?.role === "team_lead" ? (session.teamId ?? undefined) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Heading level={1}>Review queue</Heading>
      <ReviewQueue teamId={teamId} isAdmin={isAdmin} />
    </div>
  );
}
