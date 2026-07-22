// m01-cards — admin Cards panel (async server component). Lists every synced
// Mercury card, lets the admin sync on demand, and set a per-card alias. The
// alias controls are the small client field (CardAliasField); sync is a plain
// form posting to the server action.
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import type { CardWithTeamRow } from "@/lib/types";
import { getTeamsPublic } from "@/modules/m08-teams/queries";
import { CardAliasField } from "./CardAliasField";
import { CardTeamField } from "./CardTeamField";
import { SyncCardsButton } from "./SyncCardsButton";
import { getAllCards } from "./queries";

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "active" ? "success" : "neutral"}
      label={status}
    />
  );
}

function fmtSynced(ts: string): string {
  return ts ? ts.slice(0, 10) : "—";
}

export async function CardsPanel() {
  const [cards, teams]: [CardWithTeamRow[], Awaited<ReturnType<typeof getTeamsPublic>>] =
    await Promise.all([getAllCards(), getTeamsPublic()]);

  return (
    <Card padding={0}>
      <div className="flex flex-row items-start justify-between gap-4 px-5 py-4">
        <div>
          <Heading level={3}>Cards</Heading>
          <Text type="supporting">
            Synced from Mercury. Give a card an alias (e.g. “Backoffice card”) to
            organize it, and assign it to a team so its spend is tracked there —
            both survive every re-sync.
          </Text>
        </div>
        <SyncCardsButton />
      </div>
      <Divider />

      {cards.length === 0 ? (
        <div className="px-5 py-4">
          <Text type="supporting">
            No cards yet. Click “Sync cards from Mercury” to pull them in.
          </Text>
        </div>
      ) : (
        <Table density="compact">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Card</TableHeaderCell>
              <TableHeaderCell>Last 4</TableHeaderCell>
              <TableHeaderCell>Alias</TableHeaderCell>
              <TableHeaderCell>Team</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Synced</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell>
                  <div className="font-medium text-primary">
                    {card.name_on_card ?? "Card"}
                  </div>
                  <div className="text-xs text-secondary">
                    {[card.network, card.card_type]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  •••• {card.last4}
                </TableCell>
                <TableCell>
                  <CardAliasField cardId={card.id} alias={card.nickname} />
                </TableCell>
                <TableCell>
                  <CardTeamField
                    cardId={card.id}
                    currentTeamId={card.team_id}
                    teams={teams}
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge status={card.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-secondary">
                  {fmtSynced(card.synced_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
