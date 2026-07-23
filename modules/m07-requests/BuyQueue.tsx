// m07-requests — the buyer's to-buy queue (async server component). Shows every
// APPROVED request company-wide (no team scope — buyers are central purchasers)
// with the PurchaseDialog that converts each into a real subscription, stamped
// with the buyer's name. Reused by /buy.
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import type { SubscriptionRequestRow } from "@/lib/types";
import { getActiveCards } from "@/modules/m01-cards/queries";
import { getTeamsPublic } from "@/modules/m08-teams/queries";
import { PurchaseDialog } from "./PurchaseDialog";
import { getRequests } from "./queries";

function fmtDate(timestamp: string | null): string {
  return timestamp ? timestamp.slice(0, 10) : "—";
}

function fmtEstimate(row: SubscriptionRequestRow): string {
  return row.amount_estimate === null
    ? "—"
    : Number(row.amount_estimate).toFixed(2);
}

export async function BuyQueue() {
  const [rows, teams, cards] = await Promise.all([
    getRequests("approved"),
    getTeamsPublic(),
    getActiveCards(),
  ]);
  const teamNames = new Map(teams.map((t) => [t.id, t.name]));

  if (rows.length === 0) {
    return (
      <Card padding={8}>
        <Text as="p" type="supporting" justify="center" className="block">
          Nothing to buy right now — approved requests will appear here.
        </Text>
      </Card>
    );
  }

  return (
    <Card padding={0} className="overflow-x-auto">
      <Table density="balanced">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Requester</TableHeaderCell>
            <TableHeaderCell>Team</TableHeaderCell>
            <TableHeaderCell>Platform</TableHeaderCell>
            <TableHeaderCell className="text-right">Est. amount</TableHeaderCell>
            <TableHeaderCell>Approved</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium text-primary">
                  {row.requester_name}
                </div>
                <div className="text-xs text-secondary">
                  {row.requester_email}
                </div>
              </TableCell>
              <TableCell>
                {row.team_id && teamNames.get(row.team_id) ? (
                  <span>{teamNames.get(row.team_id)}</span>
                ) : (
                  <span className="text-secondary">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                <div className="font-medium text-primary">{row.platform}</div>
                {row.product && (
                  <div className="text-xs text-secondary">{row.product}</div>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right tabular-nums">
                {fmtEstimate(row)}
                <span className="text-xs text-secondary">
                  {" "}
                  / {row.billing_cycle === "monthly" ? "mo" : "yr"}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {fmtDate(row.reviewed_at)}
              </TableCell>
              <TableCell className="text-right">
                <PurchaseDialog request={row} cards={cards} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
