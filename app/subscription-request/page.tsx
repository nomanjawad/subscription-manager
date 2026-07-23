// Thin public route — anyone can ask for a subscription here (no login).
import { VStack } from "@astryxdesign/core/VStack";
import { PageHeader } from "@/components/PageHeader";
import { RequestForm } from "@/modules/m07-requests/RequestForm";
import { getTeamsPublic } from "@/modules/m08-teams/queries";

// Reads the live team list — render per request so new teams appear
// immediately instead of being baked in at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Request a subscription",
};

export default async function RequestPage() {
  const teams = await getTeamsPublic();

  return (
    <VStack gap={6} maxWidth={672} className="mx-auto w-full">
      <PageHeader
        title="Request a subscription"
        subtitle="Need a tool or service for work? Fill in the form below and the admin team will review your request."
      />
      <RequestForm teams={teams} />
    </VStack>
  );
}
