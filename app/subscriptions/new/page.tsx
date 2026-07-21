// Thin route — the subscription FORM page. Creates by default; edits an
// existing subscription when ?edit=<id> is present.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/supabase/auth";
import { getActiveCards } from "@/modules/m01-cards/queries";
import { SubscriptionForm } from "@/modules/m02-subscriptions/SubscriptionForm";
import {
  getSubscriptionOverview,
  getTags,
} from "@/modules/m02-subscriptions/queries";
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
          <h1 className="text-2xl font-semibold tracking-tight">
            Add subscription
          </h1>
          <Button asChild variant="ghost">
            <Link href="/subscriptions">Back to subscriptions</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          You haven&apos;t been assigned to a team yet — ask an admin.
        </p>
      </div>
    );
  }

  const lockedTeamId = isTeamLead ? session.teamId : undefined;

  const [cards, tags, teams, editing] = await Promise.all([
    getActiveCards(),
    getTags(lockedTeamId ?? undefined),
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
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit subscription
          </h1>
          <Button asChild variant="ghost">
            <Link href="/subscriptions">Back to subscriptions</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          This subscription belongs to another team.
        </p>
      </div>
    );
  }

  const isEdit = editing !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? `Edit subscription — ${editing.platform}` : "Add subscription"}
        </h1>
        <Button asChild variant="ghost">
          <Link href="/subscriptions">Back to subscriptions</Link>
        </Button>
      </div>

      <SubscriptionForm
        key={editing?.id ?? "create"}
        cards={cards}
        tags={tags}
        teams={teams}
        lockedTeamId={lockedTeamId}
        lockedTeamName={lockedTeamName}
        subscription={editing ?? undefined}
      />
    </div>
  );
}
