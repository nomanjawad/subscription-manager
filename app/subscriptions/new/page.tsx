// Thin route — the subscription FORM page. Creates by default; edits an
// existing subscription when ?edit=<id> is present.
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { LinkButton } from "@/components/LinkButton";
import { getSessionUser } from "@/lib/supabase/auth";
import { getActiveCards } from "@/modules/m01-cards/queries";
import { SubscriptionForm } from "@/modules/m02-subscriptions/SubscriptionForm";
import { getSubscriptionOverview } from "@/modules/m02-subscriptions/queries";
import { getTeamsPublic } from "@/modules/m08-teams/queries";

export const dynamic = "force-dynamic";

export default async function NewSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const session = await getSessionUser();

  const isTeamLead = session?.role === "team_lead";

  // A team lead with no team assignment cannot add subscriptions.
  if (isTeamLead && session.teamId === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Heading level={1}>Add subscription</Heading>
          <LinkButton
            href="/subscriptions"
            variant="ghost"
            label="Back to subscriptions"
          />
        </div>
        <Text type="supporting">
          You haven&apos;t been assigned to a team yet — ask an admin.
        </Text>
      </div>
    );
  }

  const lockedTeamId = isTeamLead ? session.teamId : undefined;

  const [cards, teams, editing] = await Promise.all([
    getActiveCards(),
    getTeamsPublic(),
    edit ? getSubscriptionOverview(edit) : Promise.resolve(null),
  ]);

  const lockedTeamName = lockedTeamId
    ? (teams.find((t) => t.id === lockedTeamId)?.name ?? null)
    : null;

  // A team lead must not load another team's subscription for edit via a
  // crafted ?edit=<id> URL (the write is already blocked, but don't leak the read).
  if (isTeamLead && editing && editing.team_id !== session.teamId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Heading level={1}>Edit subscription</Heading>
          <LinkButton
            href="/subscriptions"
            variant="ghost"
            label="Back to subscriptions"
          />
        </div>
        <Text type="supporting">
          This subscription belongs to another team.
        </Text>
      </div>
    );
  }

  const isEdit = editing !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading level={1}>
          {isEdit ? `Edit subscription — ${editing.platform}` : "Add subscription"}
        </Heading>
        <LinkButton
          href="/subscriptions"
          variant="ghost"
          label="Back to subscriptions"
        />
      </div>

      <SubscriptionForm
        key={editing?.id ?? "create"}
        cards={cards}
        teams={teams}
        lockedTeamId={lockedTeamId}
        lockedTeamName={lockedTeamName}
        subscription={editing ?? undefined}
      />
    </div>
  );
}
