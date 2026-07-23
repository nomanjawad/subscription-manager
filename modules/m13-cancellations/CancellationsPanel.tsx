// m13-cancellations — the cancellation list (server component). Rows are already
// DB-filtered by the page (team scope / status). Buyers + admins get a "Mark
// cancelled" action on pending rows; everyone else sees it read-only.
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import type { CancellationOverviewRow } from "@/lib/types";
import { CompleteCancellationButton } from "./CompleteCancellationButton";

function fmtDate(ts: string | null): string {
  return ts ? ts.slice(0, 10) : "—";
}

function StatusBadge({ status }: { status: CancellationOverviewRow["status"] }) {
  return status === "cancelled" ? (
    <Badge variant="neutral" label="cancelled" />
  ) : (
    <Badge variant="warning" label="pending cancellation" />
  );
}

function Source({ row }: { row: CancellationOverviewRow }) {
  // Internal (team lead / admin from a row) vs public form (has a requester).
  if (row.requester_email) {
    return (
      <div>
        <div className="font-medium text-primary">
          {row.requester_name ?? "—"}
        </div>
        <div className="text-xs text-secondary">{row.requester_email}</div>
      </div>
    );
  }
  return (
    <div>
      <div className="font-medium text-primary">Internal</div>
      <div className="text-xs text-secondary">
        by {row.requested_by_name ?? "—"}
      </div>
    </div>
  );
}

export function CancellationsPanel({
  rows,
  canComplete,
}: {
  rows: CancellationOverviewRow[];
  canComplete: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Card padding={8}>
        <Text as="p" type="supporting" justify="center" className="block">
          No cancellation requests.
        </Text>
      </Card>
    );
  }

  return (
    <Card padding={0} className="overflow-x-auto">
      <Table density="balanced">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Subscription</TableHeaderCell>
            <TableHeaderCell>Requested by</TableHeaderCell>
            <TableHeaderCell>Team</TableHeaderCell>
            <TableHeaderCell>Reason</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            {canComplete ? (
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium text-primary">
                  {row.platform ?? "—"}
                </div>
                {row.product && (
                  <div className="text-xs text-secondary">{row.product}</div>
                )}
              </TableCell>
              <TableCell>
                <Source row={row} />
              </TableCell>
              <TableCell>
                {row.team_name ?? (
                  <span className="text-secondary">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                {row.reason ? (
                  <span title={row.reason} className="block max-w-56 truncate">
                    {row.reason}
                  </span>
                ) : (
                  <span className="text-secondary">—</span>
                )}
              </TableCell>
              {/* Status + when it was requested / when it was cancelled */}
              <TableCell>
                <VStack gap={1} align="start">
                  <StatusBadge status={row.status} />
                  {row.status === "pending" ? (
                    <span className="whitespace-nowrap text-xs text-secondary">
                      Requested {fmtDate(row.created_at)}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap text-xs text-secondary">
                      Cancelled {fmtDate(row.cancelled_at)}
                      {row.cancelled_by_name ? ` · ${row.cancelled_by_name}` : ""}
                    </span>
                  )}
                </VStack>
              </TableCell>
              {canComplete ? (
                <TableCell className="text-right">
                  {row.status === "pending" ? (
                    <CompleteCancellationButton id={row.id} />
                  ) : (
                    <span className="text-secondary">—</span>
                  )}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
