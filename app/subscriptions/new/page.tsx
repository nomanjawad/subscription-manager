// Thin route — the subscription FORM page. Creates by default; edits an
// existing subscription when ?edit=<id> is present. Admin + buyer only
// (guarded by middleware + requireBuyerOrAdmin); both can target any team, so
// the form's team picker is never locked here.
import { Heading } from "@astryxdesign/core/Heading";
import { LinkButton } from "@/components/LinkButton";
import { requireBuyerOrAdmin } from "@/lib/supabase/auth";
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
  await requireBuyerOrAdmin();

  const [cards, teams, editing] = await Promise.all([
    getActiveCards(),
    getTeamsPublic(),
    edit ? getSubscriptionOverview(edit) : Promise.resolve(null),
  ]);

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
        subscription={editing ?? undefined}
      />
    </div>
  );
}
