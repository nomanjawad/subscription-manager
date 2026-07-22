// m13-cancellations — the cancellation list (server component). Rows are already
// DB-filtered by the page (team scope / status). Buyers + admins get a "Mark
// cancelled" action on pending rows; everyone else sees it read-only.
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
    <Card padding={0} className="overflow-hidden">
      <Table density="compact">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Subscription</TableHeaderCell>
            <TableHeaderCell>Requested by</TableHeaderCell>
            <TableHeaderCell>Team</TableHeaderCell>
            <TableHeaderCell>Reason</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Requested</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
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
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {fmtDate(row.created_at)}
              </TableCell>
              <TableCell className="text-right">
                {row.status === "pending" && canComplete ? (
                  <CompleteCancellationButton id={row.id} />
                ) : row.status === "cancelled" ? (
                  <span className="whitespace-nowrap text-xs text-secondary">
                    {row.cancelled_by_name ?? "—"} · {fmtDate(row.cancelled_at)}
                  </span>
                ) : (
                  <span className="text-secondary">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
