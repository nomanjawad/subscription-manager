// Admin Capture — onboarding/backfill tool. Pull a card's statement for this or
// last month, then map each recurring charge into a subscription assigned to a
// team. Assigned charges move to the subscriptions list; unmapped ones stay
// here. Turn the whole feature off once everything's mapped. Admin-only.
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { requireAdmin } from "@/lib/supabase/auth";
import { getAllCards } from "@/modules/m01-cards/queries";
import { getTeamsPublic } from "@/modules/m08-teams/queries";
import { CaptureControls } from "@/modules/m16-capture/CaptureControls";
import { CaptureTable } from "@/modules/m16-capture/CaptureTable";
import { CaptureToggle } from "@/modules/m16-capture/CaptureToggle";
import {
  getCaptureEnabled,
  getCapturedCharges,
  monthRange,
  type CapturePeriod,
} from "@/modules/m16-capture/queries";
import type { CardWithTeamRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Capture" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cardLabel(c: CardWithTeamRow): string {
  const name = c.nickname ?? c.name_on_card ?? "Card";
  const team = c.team_name ? ` · ${c.team_name}` : "";
  return `${name} •••• ${c.last4}${team}`;
}

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; period?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const enabled = await getCaptureEnabled();

  const header = (
    <div className="flex flex-row items-start justify-between gap-4">
      <div className="space-y-1">
        <Heading level={1}>Capture</Heading>
        <Text type="supporting">
          Pull each card&apos;s statement and map recurring charges to teams so
          every live subscription is tracked.
        </Text>
      </div>
      <CaptureToggle enabled={enabled} />
    </div>
  );

  if (!enabled) {
    return (
      <div className="space-y-6">
        {header}
        <Card padding={8}>
          <Text as="p" type="supporting" justify="center" className="block">
            Capture is turned off. Turn it back on to pull statements and map
            charges.
          </Text>
        </Card>
      </div>
    );
  }

  const [cards, teams] = await Promise.all([getAllCards(), getTeamsPublic()]);
  const cardOptions = cards.map((c) => ({ value: c.id, label: cardLabel(c) }));

  const selectedCard =
    params.card && UUID_RE.test(params.card)
      ? cards.find((c) => c.id === params.card)
      : undefined;
  const period: CapturePeriod = params.period === "last" ? "last" : "this";

  let charges = null;
  let tableLabel = "";
  if (selectedCard) {
    const range = monthRange(period);
    charges = await getCapturedCharges(
      selectedCard.mercury_card_id,
      range.start,
      range.end,
    );
    tableLabel = `${cardLabel(selectedCard)} — ${range.label}`;
  }

  return (
    <div className="space-y-6">
      {header}

      {cards.length === 0 ? (
        <Card padding={8}>
          <Text as="p" type="supporting" justify="center" className="block">
            No cards yet — sync your cards on the Cards page first.
          </Text>
        </Card>
      ) : (
        <CaptureControls
          cards={cardOptions}
          currentCardId={selectedCard?.id}
          currentPeriod={period}
        />
      )}

      {selectedCard && charges && (
        <CaptureTable charges={charges} teams={teams} monthLabel={tableLabel} />
      )}
    </div>
  );
}
