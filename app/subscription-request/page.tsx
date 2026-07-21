// Thin public route — anyone can ask for a subscription here (no login).
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Heading level={1}>Request a subscription</Heading>
        <Text type="supporting">
          Need a tool or service for work? Fill in the form below and the
          admin team will review your request.
        </Text>
      </div>

      <RequestForm teams={teams} />
    </div>
  );
}
