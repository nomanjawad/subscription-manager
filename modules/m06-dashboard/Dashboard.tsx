// m06-dashboard — async server component. Data comes exclusively from the
// three RPCs in ./queries.ts; all aggregation happens in Postgres.
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarList, DonutChart, MonthlyBars } from "@/components/charts/Charts";
import {
  getDashboardTotals,
  getSpendByCard,
  getSpendByMonth,
  getSpendByPlatform,
  getSpendByTeam,
  getUpcomingRenewals,
} from "./queries";
import { CardFilter } from "./CardFilter";

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
    // Unknown/invalid currency code — fall back to a plain rendering.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Format a YYYY-MM-DD date string without timezone drift. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d || !MONTHS[m - 1]) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** Today's local date as YYYY-MM-DD, comparable to Postgres `date` strings. */
function localTodayISO(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
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
  href,
}: {
  label: string;
  value: string;
  tone?: Tone;
  href?: string;
}) {
  const inner = (
    <CardContent>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tracking-tight ${VALUE_TONE[tone]}`}>
        {value}
      </p>
    </CardContent>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        <Card size="sm" className="h-full transition-shadow hover:ring-foreground/25">
          {inner}
        </Card>
      </Link>
    );
  }
  return (
    <Card size="sm" className="h-full">
      {inner}
    </Card>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm" className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
        <CardTitle>{title}</CardTitle>
        {action}
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

// ── Admin spending charts ───────────────────────────────────────────────────

const SPEND_MONTHS = 12;

async function SpendingCharts({ cardFilter }: { cardFilter?: string }) {
  const [byMonth, byTeam, byCard] = await Promise.all([
    getSpendByMonth(SPEND_MONTHS, cardFilter),
    getSpendByTeam(),
    getSpendByCard(),
  ]);

  const cardOptions = byCard.map((c) => ({
    id: c.mercury_card_id,
    label: cardLabel(c),
  }));
  const monthHasData = byMonth.some((m) => m.total_out > 0);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Monthly spend"
        action={<CardFilter cards={cardOptions} selected={cardFilter} />}
      >
        <CardContent>
          {monthHasData ? (
            <MonthlyBars data={byMonth.map((m) => ({ month: m.month, value: m.total_out }))} formatValue={(n) => money(n)} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No card spend recorded in the last {SPEND_MONTHS} months
              {cardFilter ? " for this card" : ""}.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Actual money out of Mercury, across all synced transactions.
          </p>
        </CardContent>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Spend by team">
          {byTeam.length === 0 ? (
            <EmptyState>No team spend to report yet.</EmptyState>
          ) : (
            <CardContent>
              <DonutChart
                data={byTeam.map((t) => ({
                  label: t.team_name,
                  value: t.monthly_amount,
                }))}
                formatValue={(n) => money(n)}
              />
              <p className="mt-4 text-xs text-muted-foreground">
                Normalized monthly subscription cost per team.
              </p>
            </CardContent>
          )}
        </SectionCard>

        <SectionCard title="Spend by card">
          {byCard.length === 0 ? (
            <EmptyState>No card transactions synced yet.</EmptyState>
          ) : (
            <CardContent>
              <BarList
                data={byCard.map((c) => ({
                  label: cardLabel(c),
                  value: c.total_out,
                  sub: `· ${c.transaction_count} tx`,
                }))}
                formatValue={(n) => money(n)}
              />
            </CardContent>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────

const RENEWAL_WINDOW_DAYS = 30;

export default async function Dashboard({
  teamId,
  isAdmin = false,
  cardFilter,
}: {
  teamId?: string;
  isAdmin?: boolean;
  cardFilter?: string;
}) {
  const [totals, renewals, spend] = await Promise.all([
    getDashboardTotals(teamId),
    getUpcomingRenewals(RENEWAL_WINDOW_DAYS, teamId),
    getSpendByPlatform(teamId),
  ]);

  const today = localTodayISO();
  const maxSpend = spend.reduce((max, r) => Math.max(max, r.monthly_amount), 0);

  return (
    <div className="space-y-6">
      {totals === null && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
          Database not ready — start local Supabase (<code>supabase start</code>)
          and apply the migrations, then reload this page.
        </div>
      )}

      {/* Stat tiles */}
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
          href="/review"
        />
        <StatTile
          label="Failures last 90 days"
          value={totals ? String(totals.failed_count) : "—"}
          tone={totals && totals.failed_count > 0 ? "red" : "default"}
        />
      </div>

      {/* Admin-only spending charts (monthly trend, by team, by card). */}
      {isAdmin && <SpendingCharts cardFilter={cardFilter} />}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upcoming renewals */}
        <div className="lg:col-span-3">
          <SectionCard title={`Upcoming renewals (${RENEWAL_WINDOW_DAYS} days)`}>
            {renewals.length === 0 ? (
              <EmptyState>
                No renewals due in the next {RENEWAL_WINDOW_DAYS} days.
              </EmptyState>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 text-xs text-muted-foreground">
                      Subscription
                    </TableHead>
                    <TableHead className="px-4 text-right text-xs text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="px-4 text-xs text-muted-foreground">
                      Renews
                    </TableHead>
                    <TableHead className="px-4 text-xs text-muted-foreground">
                      Card
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewals.map((r) => {
                    const overdue = r.next_renewal_date < today;
                    const isToday = r.next_renewal_date === today;
                    return (
                      <TableRow key={r.subscription_id}>
                        <TableCell className="whitespace-normal px-4 py-3">
                          <span className="font-medium text-foreground">
                            {r.platform}
                          </span>
                          {r.product && (
                            <span className="ml-1.5 text-muted-foreground">
                              {r.product}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right tabular-nums">
                          {money(r.amount, r.currency)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span
                            className={
                              overdue
                                ? "font-medium text-destructive"
                                : isToday
                                  ? "font-medium text-amber-600 dark:text-amber-400"
                                  : undefined
                            }
                          >
                            {formatDate(r.next_renewal_date)}
                          </span>
                          {overdue && (
                            <Badge variant="destructive" className="ml-2">
                              Overdue
                            </Badge>
                          )}
                          {isToday && (
                            <Badge
                              variant="secondary"
                              className="ml-2 bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            >
                              Today
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground">
                          {r.card_last4 ? `•••• ${r.card_last4}` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </div>

        {/* Spend by platform */}
        <div className="lg:col-span-2">
          <SectionCard title="Spend by platform">
            {spend.length === 0 ? (
              <EmptyState>No active subscriptions yet.</EmptyState>
            ) : (
              <CardContent>
                <ul className="space-y-4">
                  {spend.map((row) => {
                    const pct =
                      maxSpend > 0
                        ? Math.max((row.monthly_amount / maxSpend) * 100, 2)
                        : 0;
                    return (
                      <li key={row.platform}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-foreground">
                            {row.platform}
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
        </div>
      </div>
    </div>
  );
}
