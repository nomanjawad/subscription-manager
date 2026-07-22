// Thin public route — anyone can request a subscription cancellation (no login).
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { CancellationForm } from "@/modules/m13-cancellations/CancellationForm";
import { getTeamsPublic } from "@/modules/m08-teams/queries";

// Reads the live team list — render per request so new teams appear immediately.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cancel a subscription",
};

export default async function CancellationRequestPage() {
  const teams = await getTeamsPublic();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Heading level={1}>Cancel a subscription</Heading>
        <Text type="supporting">
          Need to cancel a tool or service? Fill in the form below and we&apos;ll
          take it from there.
        </Text>
      </div>

      <CancellationForm teams={teams} />
    </div>
  );
}
