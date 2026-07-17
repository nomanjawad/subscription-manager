// m02-subscriptions — async server component rendering the (already DB-filtered)
// subscription rows. Row actions post straight to the lifecycle server actions.
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CheckStatus, SubscriptionOverviewRow } from "@/lib/types";
import { cancelSubscription, reactivateSubscription } from "./actions";

interface SubscriptionTableProps {
  rows: SubscriptionOverviewRow[];
}

function StatusBadge({ status }: { status: SubscriptionOverviewRow["status"] }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {status}
    </Badge>
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
      return <Badge variant="secondary">renewed</Badge>;
    case "failed":
      return (
        <Badge variant="destructive" title={failureReason ?? undefined}>
          failed
        </Badge>
      );
    case "needs_review":
      return <Badge variant="outline">needs review</Badge>;
    case "pending":
      return <Badge variant="ghost">pending</Badge>;
    default:
      return <span className="text-muted-foreground">—</span>;
  }
}

function cardLabel(row: SubscriptionOverviewRow): string {
  if (!row.card_id) return "—";
  const name = row.card_nickname ?? row.card_name ?? "Card";
  return row.card_last4 ? `${name} ••${row.card_last4}` : name;
}

export async function SubscriptionTable({ rows }: SubscriptionTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Tag</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Next renewal</TableHead>
            <TableHead>Card</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last check</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-24 text-center text-muted-foreground"
              >
                No subscriptions match — adjust the filters or add one.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="font-medium">{row.platform}</div>
                  {row.product && (
                    <div className="text-xs text-muted-foreground">
                      {row.product}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {row.tag ? (
                    <Badge variant="outline">{row.tag}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {Number(row.amount).toFixed(2)} {row.currency}
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    / {row.billing_cycle === "monthly" ? "mo" : "yr"}
                  </span>
                </TableCell>
                <TableCell>{row.next_renewal_date}</TableCell>
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
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/subscriptions/new?edit=${row.id}`}>
                        Edit
                      </Link>
                    </Button>
                    {row.status === "active" ? (
                      <form action={cancelSubscription.bind(null, row.id)}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <form action={reactivateSubscription.bind(null, row.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Reactivate
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
