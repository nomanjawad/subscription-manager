// m09-analytics — admin-only, async server component. Data comes exclusively
// from the three RPCs in ./queries.ts; all aggregation happens in Postgres.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getOverallTotals,
  getSpendByCard,
  getSpendByTeam,
} from "./queries";

// ── Formatting helpers ────────────────────────────────────────────────────

function money(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// ── Small presentational pieces ───────────────────────────────────────────

type Tone = "default" | "amber" | "red";

const VALUE_TONE: Record<Tone, string> = {
  default: "text-foreground",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-destructive",
};

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <Card size="sm" className="h-full">
      <CardContent>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={`mt-1.5 text-2xl font-semibold tracking-tight ${VALUE_TONE[tone]}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm" className="h-full">
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {children}
    </Card>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** A card's display label: nickname, else name, else a generic fallback. */
function cardLabel(row: {
  card_nickname: string | null;
  card_name: string | null;
  card_last4: string | null;
}): string {
  const name = row.card_nickname || row.card_name || "Card";
  return row.card_last4 ? `${name} •••• ${row.card_last4}` : name;
}

// ── AnalyticsPanel ─────────────────────────────────────────────────────────

export default async function AnalyticsPanel() {
  const [totals, byTeam, byCard] = await Promise.all([
    getOverallTotals(),
    getSpendByTeam(),
    getSpendByCard(),
  ]);

  const maxTeamSpend = byTeam.reduce(
    (max, r) => Math.max(max, r.monthly_amount),
    0,
  );

  return (
    <div className="space-y-6">
      {totals === null && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
          Database not ready — start local Supabase (<code>supabase start</code>)
          and apply the migrations, then reload this page.
        </div>
      )}

      {/* Overall stat tiles (all teams) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Active subscriptions"
          value={totals ? String(totals.active_subscriptions) : "—"}
        />
        <StatTile
          label="Monthly spend"
          value={totals ? money(totals.monthly_spend) : "—"}
        />
        <StatTile
          label="Yearly spend"
          value={totals ? money(totals.yearly_spend) : "—"}
        />
        <StatTile
          label="Needs review"
          value={totals ? String(totals.needs_review_count) : "—"}
          tone={totals && totals.needs_review_count > 0 ? "amber" : "default"}
        />
        <StatTile
          label="Failures last 90 days"
          value={totals ? String(totals.failed_count) : "—"}
          tone={totals && totals.failed_count > 0 ? "red" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spend by team */}
        <SectionCard title="Spend by team">
          {byTeam.length === 0 ? (
            <EmptyState>No team spend to report yet.</EmptyState>
          ) : (
            <CardContent>
              <ul className="space-y-4">
                {byTeam.map((row) => {
                  const pct =
                    maxTeamSpend > 0
                      ? Math.max((row.monthly_amount / maxTeamSpend) * 100, 2)
                      : 0;
                  return (
                    <li key={row.team_id ?? "unassigned"}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-foreground">
                          {row.team_name}
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            · {row.subscription_count}{" "}
                            {row.subscription_count === 1 ? "sub" : "subs"}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {money(row.monthly_amount)}/mo
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary/20">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          )}
        </SectionCard>

        {/* Spend across all cards */}
        <SectionCard title="Spend across all cards">
          {byCard.length === 0 ? (
            <EmptyState>No card transactions synced yet.</EmptyState>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 text-xs text-muted-foreground">
                      Card
                    </TableHead>
                    <TableHead className="px-4 text-right text-xs text-muted-foreground">
                      Total spent
                    </TableHead>
                    <TableHead className="px-4 text-right text-xs text-muted-foreground">
                      Transactions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byCard.map((row) => (
                    <TableRow key={row.mercury_card_id}>
                      <TableCell className="whitespace-normal px-4 py-3 font-medium text-foreground">
                        {cardLabel(row)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums">
                        {money(row.total_out)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {row.transaction_count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Covers all synced Mercury transactions, not only subscription
                  renewals.
                </p>
              </CardContent>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
