// m02-subscriptions — async server component rendering the (already DB-filtered)
// subscription rows. Related fields are grouped to keep the table readable: the
// tag rides with the platform, the last renewal check sits under the status, and
// row actions collapse into a compact ⋯ menu (SubscriptionRowActions).
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import type { CheckStatus, SubscriptionOverviewRow } from "@/lib/types";
import { SubscriptionRowActions } from "./SubscriptionRowActions";

interface SubscriptionTableProps {
  rows: SubscriptionOverviewRow[];
  /** Show row lifecycle actions (edit / request-cancellation / reactivate).
   *  Buyers viewing their purchases get a read-only table. */
  canManage?: boolean;
  /** Role-prefixed path to the create/edit form, e.g. "/admin/subscriptions/new". */
  newBasePath: string;
}

function StatusBadge({ status }: { status: SubscriptionOverviewRow["status"] }) {
  return (
    <Badge
      variant={status === "active" ? "success" : "neutral"}
      label={status}
    />
  );
}

/** The last renewal-check result, shown as a small badge under the status.
 *  Returns null when there's been no check yet. */
function CheckLine({
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
          <Badge variant="error" label="check failed" />
        </span>
      );
    case "needs_review":
      return <Badge variant="warning" label="needs review" />;
    case "pending":
      return <Badge variant="neutral" label="check pending" />;
    default:
      return null;
  }
}

function cardLabel(row: SubscriptionOverviewRow): string {
  if (!row.card_id) return "—";
  const name = row.card_nickname ?? row.card_name ?? "Card";
  return row.card_last4 ? `${name} ••${row.card_last4}` : name;
}

export async function SubscriptionTable({
  rows,
  canManage = true,
  newBasePath,
}: SubscriptionTableProps) {
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
    <Card padding={0} className="overflow-x-auto">
      <Table density="balanced">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Platform</TableHeaderCell>
            <TableHeaderCell>Team</TableHeaderCell>
            <TableHeaderCell className="text-right">Amount</TableHeaderCell>
            <TableHeaderCell>Next renewal</TableHeaderCell>
            <TableHeaderCell>Card</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            {canManage ? (
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {/* Platform + product, with the tag riding alongside the name */}
              <TableCell>
                <VStack gap={0.5} align="start">
                  <HStack gap={1.5} align="center" wrap="wrap">
                    <span className="font-medium text-primary">
                      {row.platform}
                    </span>
                    {row.tag ? (
                      <Badge variant="neutral" label={row.tag} />
                    ) : null}
                  </HStack>
                  {row.product ? (
                    <span className="text-xs text-secondary">{row.product}</span>
                  ) : null}
                </VStack>
              </TableCell>

              <TableCell>
                {row.team_name ? (
                  row.team_name
                ) : (
                  <span className="text-secondary">Unassigned</span>
                )}
              </TableCell>

              <TableCell className="whitespace-nowrap text-right tabular-nums">
                {Number(row.amount).toFixed(2)} {row.currency}
                <span className="text-xs text-secondary">
                  {" "}
                  / {row.billing_cycle === "monthly" ? "mo" : "yr"}
                </span>
              </TableCell>

              <TableCell className="whitespace-nowrap">
                {row.next_renewal_date}
              </TableCell>

              <TableCell className="whitespace-nowrap">
                {cardLabel(row)}
              </TableCell>

              {/* Status + the latest renewal-check result stacked beneath it */}
              <TableCell>
                <VStack gap={1} align="start">
                  <HStack gap={1} align="center" wrap="wrap">
                    <StatusBadge status={row.status} />
                    {row.status === "active" && row.cancellation_pending ? (
                      <Badge variant="warning" label="cancellation pending" />
                    ) : null}
                  </HStack>
                  <CheckLine
                    status={row.last_check_status}
                    failureReason={row.last_check_failure_reason}
                  />
                </VStack>
              </TableCell>

              {canManage ? (
                <TableCell className="text-right">
                  <SubscriptionRowActions
                    id={row.id}
                    status={row.status}
                    cancellationPending={Boolean(row.cancellation_pending)}
                    editHref={`${newBasePath}?edit=${row.id}`}
                  />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
