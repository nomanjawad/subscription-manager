// m07-requests — admin panel (async server component). Tabs are plain links
// (?tab=…) so each tab's rows are fetched with a DB-side status filter; only
// the active tab's table is queried and rendered.
import { getActiveCards } from "@/modules/m01-cards/queries";
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { LinkButton } from "@/components/LinkButton";
import { Text } from "@astryxdesign/core/Text";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
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
      return <Badge variant="success" label="purchased" />;
    case "rejected":
      return <Badge variant="error" label="rejected" />;
    case "approved":
      return <Badge variant="warning" label="pending purchase" />;
    default:
      return <Badge variant="neutral" label="requested" />;
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
      <div className="font-medium text-primary">{row.requester_name}</div>
      <div className="text-xs text-secondary">{row.requester_email}</div>
    </div>
  );
}

function PlatformProduct({ row }: { row: SubscriptionRequestRow }) {
  return (
    <div>
      <div className="font-medium text-primary">{row.platform}</div>
      {row.product && (
        <div className="text-xs text-secondary">{row.product}</div>
      )}
    </div>
  );
}

function Reason({ reason }: { reason: string | null }) {
  if (!reason) return <span className="text-secondary">—</span>;
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
  if (!name) return <span className="text-secondary">Unassigned</span>;
  return <span>{name}</span>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card padding={8}>
      <Text as="p" type="supporting" justify="center" className="block">
        {message}
      </Text>
    </Card>
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
    <Card padding={0} className="overflow-hidden">
      <Table density="compact">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Requester</TableHeaderCell>
            <TableHeaderCell>Team</TableHeaderCell>
            <TableHeaderCell>Platform</TableHeaderCell>
            <TableHeaderCell>Est. amount</TableHeaderCell>
            <TableHeaderCell>Cycle</TableHeaderCell>
            <TableHeaderCell>Reason</TableHeaderCell>
            <TableHeaderCell>Submitted</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
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
    </Card>
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
    <Card padding={0} className="overflow-hidden">
      <Table density="compact">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Requester</TableHeaderCell>
            <TableHeaderCell>Team</TableHeaderCell>
            <TableHeaderCell>Platform</TableHeaderCell>
            <TableHeaderCell>Est. amount</TableHeaderCell>
            <TableHeaderCell>Cycle</TableHeaderCell>
            <TableHeaderCell>Reason</TableHeaderCell>
            <TableHeaderCell>Approved</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
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
    </Card>
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
    <Card padding={0} className="overflow-hidden">
      <Table density="compact">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Requester</TableHeaderCell>
            <TableHeaderCell>Team</TableHeaderCell>
            <TableHeaderCell>Platform</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Review note</TableHeaderCell>
            <TableHeaderCell>Reviewed</TableHeaderCell>
            <TableHeaderCell>Submitted</TableHeaderCell>
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
    </Card>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────

const TAB_STATUS: Record<RequestsTab, RequestStatus | RequestStatus[]> = {
  requested: "requested",
  pending: "approved",
  history: ["purchased", "rejected"],
};

function TabLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <LinkButton
      href={href}
      label={label}
      variant={active ? "secondary" : "ghost"}
      size="sm"
    />
  );
}

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
      <div className="inline-flex items-center gap-1 rounded-lg border border-default p-1">
        <TabLink
          href="/requests?tab=requested"
          label={`Requested (${counts.requested})`}
          active={active === "requested"}
        />
        <TabLink
          href="/requests?tab=pending"
          label={`Pending purchase (${counts.approved})`}
          active={active === "pending"}
        />
        <TabLink
          href="/requests?tab=history"
          label="History"
          active={active === "history"}
        />
      </div>

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
