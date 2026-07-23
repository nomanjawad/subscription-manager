// Thin public route — anyone can request a subscription cancellation (no login).
import { VStack } from "@astryxdesign/core/VStack";
import { PageHeader } from "@/components/PageHeader";
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
    <VStack gap={6} maxWidth={672} className="mx-auto w-full">
      <PageHeader
        title="Cancel a subscription"
        subtitle="Need to cancel a tool or service? Fill in the form below and we'll take it from there."
      />
      <CancellationForm teams={teams} />
    </VStack>
  );
}
