// m02-subscriptions — async server component rendering the (already DB-filtered)
// subscription rows. Row actions post straight to the lifecycle server actions.
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { LinkButton } from "@/components/LinkButton";
import { Text } from "@astryxdesign/core/Text";
import {
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import type { CheckStatus, SubscriptionOverviewRow } from "@/lib/types";
import { cancelSubscription, reactivateSubscription } from "./actions";

interface SubscriptionTableProps {
  rows: SubscriptionOverviewRow[];
}

function StatusBadge({ status }: { status: SubscriptionOverviewRow["status"] }) {
  return (
    <Badge
      variant={status === "active" ? "success" : "neutral"}
      label={status}
    />
  );
}

function CheckBadge({
  status,
  failureReason,
}: {
  status: CheckStatus | null;
  failureReason: string | null;
}) {
  switch (status) {
    case "renewed":
      return <Badge variant="success" label="renewed" />;
    case "failed":
      return (
        <span title={failureReason ?? undefined}>
          <Badge variant="error" label="failed" />
        </span>
      );
    case "needs_review":
      return <Badge variant="warning" label="needs review" />;
    case "pending":
      return <Badge variant="neutral" label="pending" />;
    default:
      return <span className="text-secondary">—</span>;
  }
}

function cardLabel(row: SubscriptionOverviewRow): string {
  if (!row.card_id) return "—";
  const name = row.card_nickname ?? row.card_name ?? "Card";
  return row.card_last4 ? `${name} ••${row.card_last4}` : name;
}

export async function SubscriptionTable({ rows }: SubscriptionTableProps) {
  if (rows.length === 0) {
    return (
      <Card padding={8}>
        <Text as="p" type="supporting" justify="center" className="block">
          No subscriptions match — adjust the filters or add one.
        </Text>
      </Card>
    );
  }

  return (
    <Card padding={0} className="overflow-hidden">
      <Table density="compact">
        <TableRow isHeaderRow>
          <TableHeaderCell>Platform</TableHeaderCell>
          <TableHeaderCell>Team</TableHeaderCell>
          <TableHeaderCell>Tag</TableHeaderCell>
          <TableHeaderCell>Amount</TableHeaderCell>
          <TableHeaderCell>Next renewal</TableHeaderCell>
          <TableHeaderCell>Card</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Last check</TableHeaderCell>
          <TableHeaderCell className="text-right">Actions</TableHeaderCell>
        </TableRow>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div className="font-medium text-primary">{row.platform}</div>
              {row.product && (
                <div className="text-xs text-secondary">{row.product}</div>
              )}
            </TableCell>
            <TableCell>{row.team_name ?? "Unassigned"}</TableCell>
            <TableCell>
              {row.tag ? (
                <Badge variant="neutral" label={row.tag} />
              ) : (
                <span className="text-secondary">—</span>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {Number(row.amount).toFixed(2)} {row.currency}
              <span className="text-xs text-secondary">
                {" "}
                / {row.billing_cycle === "monthly" ? "mo" : "yr"}
              </span>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {row.next_renewal_date}
            </TableCell>
            <TableCell>{cardLabel(row)}</TableCell>
            <TableCell>
              <StatusBadge status={row.status} />
            </TableCell>
            <TableCell>
              <CheckBadge
                status={row.last_check_status}
                failureReason={row.last_check_failure_reason}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="inline-flex items-center gap-1">
                <LinkButton
                  href={`/subscriptions/new?edit=${row.id}`}
                  label="Edit"
                  variant="ghost"
                  size="sm"
                />
                {row.status === "active" ? (
                  <form action={cancelSubscription.bind(null, row.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      label="Cancel"
                      className="text-error"
                    />
                  </form>
                ) : (
                  <form action={reactivateSubscription.bind(null, row.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      label="Reactivate"
                    />
                  </form>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </Card>
  );
}
