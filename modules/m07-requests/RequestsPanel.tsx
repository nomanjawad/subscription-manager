// m07-requests — admin panel (async server component). Tabs are plain links
// (?tab=…) so each tab's rows are fetched with a DB-side status filter; only
// the active tab's table is queried and rendered.
import Link from "next/link";
import { getActiveCards } from "@/modules/m01-cards/queries";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RequestStatus, SubscriptionRequestRow } from "@/lib/types";
import { getTeamsPublic } from "@/modules/m08-teams/queries";
import { PurchaseDialog } from "./PurchaseDialog";
import { RequestActions } from "./RequestActions";
import { getRequestCounts, getRequests } from "./queries";

export type RequestsTab = "requested" | "pending" | "history";

function normalizeTab(tab: string | undefined): RequestsTab {
  return tab === "pending" || tab === "history" ? tab : "requested";
}

// ── Small render helpers ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: RequestStatus }) {
  switch (status) {
    case "purchased":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          purchased
        </Badge>
      );
    case "rejected":
      return <Badge variant="destructive">rejected</Badge>;
    case "approved":
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          pending purchase
        </Badge>
      );
    default:
      return <Badge variant="secondary">requested</Badge>;
  }
}

function fmtDate(timestamp: string | null): string {
  return timestamp ? timestamp.slice(0, 10) : "—";
}

function fmtEstimate(row: SubscriptionRequestRow): string {
  return row.amount_estimate === null
    ? "—"
    : Number(row.amount_estimate).toFixed(2);
}

function Requester({ row }: { row: SubscriptionRequestRow }) {
  return (
    <div>
      <div className="font-medium">{row.requester_name}</div>
      <div className="text-xs text-muted-foreground">{row.requester_email}</div>
    </div>
  );
}

function PlatformProduct({ row }: { row: SubscriptionRequestRow }) {
  return (
    <div>
      <div className="font-medium">{row.platform}</div>
      {row.product && (
        <div className="text-xs text-muted-foreground">{row.product}</div>
      )}
    </div>
  );
}

function Reason({ reason }: { reason: string | null }) {
  if (!reason) return <span className="text-muted-foreground">—</span>;
  return (
    <span title={reason} className="block max-w-56 truncate">
      {reason}
    </span>
  );
}

function TeamName({
  row,
  teamNames,
}: {
  row: SubscriptionRequestRow;
  teamNames: Map<string, string>;
}) {
  const name = row.team_id ? teamNames.get(row.team_id) : null;
  if (!name) return <span className="text-muted-foreground">Unassigned</span>;
  return <span>{name}</span>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ── Per-tab tables ───────────────────────────────────────────────────────

function RequestedTable({
  rows,
  teamNames,
}: {
  rows: SubscriptionRequestRow[];
  teamNames: Map<string, string>;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No open requests — all caught up." />;
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requester</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Est. amount</TableHead>
            <TableHead>Cycle</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Requester row={row} />
              </TableCell>
              <TableCell>
                <TeamName row={row} teamNames={teamNames} />
              </TableCell>
              <TableCell>
                <PlatformProduct row={row} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {fmtEstimate(row)}
              </TableCell>
              <TableCell>{row.billing_cycle}</TableCell>
              <TableCell>
                <Reason reason={row.reason} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {fmtDate(row.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <RequestActions requestId={row.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

async function PendingTable({
  rows,
  teamNames,
}: {
  rows: SubscriptionRequestRow[];
  teamNames: Map<string, string>;
}) {
  if (rows.length === 0) {
    return <EmptyState message="Nothing pending purchase." />;
  }
  const cards = await getActiveCards();
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requester</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Est. amount</TableHead>
            <TableHead>Cycle</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Approved</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Requester row={row} />
              </TableCell>
              <TableCell>
                <TeamName row={row} teamNames={teamNames} />
              </TableCell>
              <TableCell>
                <PlatformProduct row={row} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {fmtEstimate(row)}
              </TableCell>
              <TableCell>{row.billing_cycle}</TableCell>
              <TableCell>
                <Reason reason={row.reason} />
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
    </div>
  );
}

function HistoryTable({
  rows,
  teamNames,
}: {
  rows: SubscriptionRequestRow[];
  teamNames: Map<string, string>;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No purchased or rejected requests yet." />;
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requester</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Review note</TableHead>
            <TableHead>Reviewed</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Requester row={row} />
              </TableCell>
              <TableCell>
                <TeamName row={row} teamNames={teamNames} />
              </TableCell>
              <TableCell>
                <PlatformProduct row={row} />
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                <Reason reason={row.review_note} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {fmtDate(row.reviewed_at)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {fmtDate(row.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────

const TAB_STATUS: Record<RequestsTab, RequestStatus | RequestStatus[]> = {
  requested: "requested",
  pending: "approved",
  history: ["purchased", "rejected"],
};

export async function RequestsPanel({
  tab,
  teamId,
}: {
  tab: string | undefined;
  teamId?: string;
}) {
  const active = normalizeTab(tab);

  const [counts, rows, teams] = await Promise.all([
    getRequestCounts(teamId),
    getRequests(TAB_STATUS[active], teamId),
    getTeamsPublic(),
  ]);
  const teamNames = new Map(teams.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-4">
      <Tabs value={active}>
        <TabsList>
          <TabsTrigger value="requested" asChild>
            <Link href="/requests?tab=requested">
              Requested ({counts.requested})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="pending" asChild>
            <Link href="/requests?tab=pending">
              Pending purchase ({counts.approved})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="history" asChild>
            <Link href="/requests?tab=history">History</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {active === "requested" && (
        <RequestedTable rows={rows} teamNames={teamNames} />
      )}
      {active === "pending" && (
        <PendingTable rows={rows} teamNames={teamNames} />
      )}
      {active === "history" && (
        <HistoryTable rows={rows} teamNames={teamNames} />
      )}
    </div>
  );
}
