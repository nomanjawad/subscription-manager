// m16-capture — the captured-charges table (server component). Money-out charges
// for the selected card + month; each unmapped one gets a "Map to subscription"
// dialog, mapped ones show a link-through badge.
import { Badge } from "@astryxdesign/core/Badge";
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
import type { TeamOption } from "@/lib/types";
import { MapChargeDialog } from "./MapChargeDialog";
import type { CapturedCharge } from "./queries";

function fmtDate(ts: string | null): string {
  return ts ? ts.slice(0, 10) : "—";
}

export function CaptureTable({
  charges,
  teams,
  monthLabel,
}: {
  charges: CapturedCharge[];
  teams: TeamOption[];
  monthLabel: string;
}) {
  if (charges.length === 0) {
    return (
      <Card padding={8}>
        <Text as="p" type="supporting" justify="center" className="block">
          No charges captured for {monthLabel}. Click “Capture statement” to pull
          it from the bank.
        </Text>
      </Card>
    );
  }

  const mappedCount = charges.filter((c) => c.mappedSubscriptionId).length;

  return (
    <div className="space-y-3">
      <Text type="supporting">
        {monthLabel} — {charges.length} charge{charges.length === 1 ? "" : "s"},{" "}
        {mappedCount} mapped, {charges.length - mappedCount} to review.
      </Text>
      <Card padding={0} className="overflow-x-auto">
        <Table density="compact">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Merchant</TableHeaderCell>
              <TableHeaderCell className="text-right">Amount</TableHeaderCell>
              <TableHeaderCell className="text-right">Status</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.map((c) => (
              <TableRow key={c.transactionId}>
                <TableCell className="whitespace-nowrap">
                  {fmtDate(c.postedAt)}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-primary">
                    {c.counterparty ?? "—"}
                  </div>
                  {c.description && (
                    <div className="text-xs text-secondary">
                      {c.description}
                    </div>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  {c.amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {c.mappedSubscriptionId ? (
                    <Badge
                      variant="success"
                      label={`Mapped → ${c.mappedPlatform ?? "subscription"}`}
                    />
                  ) : (
                    <MapChargeDialog charge={c} teams={teams} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
