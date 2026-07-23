// m06-dashboard — async server component. Data comes exclusively from the
// three RPCs in ./queries.ts; all aggregation happens in Postgres.
import Link from "next/link";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { StatIcon, type StatIconId } from "@/components/StatIcon";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { BarList, DonutChart, MonthlyBars } from "@/components/charts/Charts";
import {
  getDashboardTotals,
  getSpendByCard,
  getSpendByMonth,
  getSpendByPlatform,
  getSpendByTeam,
  getSpendByTeamActual,
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
  default: "text-primary",
  amber: "text-warning",
  red: "text-error",
};

type IconColor = "accent" | "warning" | "error";
const ICON_TONE: Record<Tone, IconColor> = {
  default: "accent",
  amber: "warning",
  red: "error",
};
// Muted background chip behind the icon, tinted to match the tone.
const ICON_CHIP_TONE: Record<Tone, string> = {
  default: "bg-accent-muted",
  amber: "bg-warning-muted",
  red: "bg-error-muted",
};

function StatTile({
  label,
  value,
  icon,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  icon: StatIconId;
  tone?: Tone;
  href?: string;
}) {
  const inner = (
    <Card
      padding={4}
      className={
        href
          ? "h-full transition hover:ring-2 hover:ring-border-strong"
          : "h-full"
      }
    >
      <HStack gap={3} align="center">
        <span
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${ICON_CHIP_TONE[tone]}`}
        >
          <StatIcon id={icon} color={ICON_TONE[tone]} />
        </span>
        <VStack gap={0.5}>
          <Text type="supporting">{label}</Text>
          <Text size="2xl" weight="semibold" className={VALUE_TONE[tone]}>
            {value}
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
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
    <Card padding={0} className="h-full">
      <HStack justify="between" align="center" gap={3} paddingInline={5} paddingBlock={4}>
        <Heading level={3}>{title}</Heading>
        {action}
      </HStack>
      <Divider />
      {children}
    </Card>
  );
}

/** Padded content region inside a SectionCard (tables render full-bleed). */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <VStack paddingInline={5} paddingBlock={4} gap={0}>
      {children}
    </VStack>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Text
      as="p"
      type="supporting"
      justify="center"
      className="block px-5 py-8 text-center"
    >
      {children}
    </Text>
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
  const [byMonth, byTeam, byTeamActual, byCard] = await Promise.all([
    getSpendByMonth(SPEND_MONTHS, cardFilter),
    getSpendByTeam(),
    getSpendByTeamActual(),
    getSpendByCard(),
  ]);

  const cardOptions = byCard.map((c) => ({
    id: c.mercury_card_id,
    label: cardLabel(c),
  }));
  const monthHasData = byMonth.some((m) => m.total_out > 0);
  // Actual spend sitting on cards not yet assigned to a team (team_id null).
  const unassignedActual =
    byTeamActual.find((t) => t.team_id === null)?.total_out ?? 0;

  return (
    <div className="space-y-6">
      {unassignedActual > 0 && (
        <Banner
          status="warning"
          title={`${money(unassignedActual)} of card spend isn't assigned to a team`}
          description="Some transactions are on cards with no team. Assign those cards to a team on the Cards page so their spend is tracked."
          container="card"
        />
      )}
      <SectionCard
        title="Monthly spend"
        action={<CardFilter cards={cardOptions} selected={cardFilter} />}
      >
        <Panel>
          {monthHasData ? (
            <MonthlyBars data={byMonth.map((m) => ({ month: m.month, value: m.total_out }))} formatValue={(n) => money(n)} />
          ) : (
            <Text as="p" type="supporting" justify="center" className="block py-8 text-center">
              No card spend recorded in the last {SPEND_MONTHS} months
              {cardFilter ? " for this card" : ""}.
            </Text>
          )}
          <Text as="p" type="supporting" className="mt-3 block">
            Actual money out of Mercury, across all synced transactions.
          </Text>
        </Panel>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Spend by team — planned">
          {byTeam.length === 0 ? (
            <EmptyState>No team spend to report yet.</EmptyState>
          ) : (
            <Panel>
              <DonutChart
                data={byTeam.map((t) => ({
                  label: t.team_name,
                  value: t.monthly_amount,
                }))}
                formatValue={(n) => money(n)}
              />
              <Text as="p" type="supporting" className="mt-4 block">
                Normalized monthly subscription cost committed per team.
              </Text>
            </Panel>
          )}
        </SectionCard>

        <SectionCard title="Spend by team — actual">
          {byTeamActual.length === 0 ? (
            <EmptyState>No card transactions to attribute yet.</EmptyState>
          ) : (
            <Panel>
              <BarList
                data={byTeamActual.map((t) => ({
                  label: t.team_name,
                  value: t.total_out,
                  sub: `· ${t.transaction_count} tx`,
                }))}
                formatValue={(n) => money(n)}
              />
              <Text as="p" type="supporting" className="mt-4 block">
                Real money out of Mercury, attributed by the card&apos;s team.
              </Text>
            </Panel>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Spend by card">
        {byCard.length === 0 ? (
          <EmptyState>No card transactions synced yet.</EmptyState>
        ) : (
          <Panel>
            <BarList
              data={byCard.map((c) => ({
                label: cardLabel(c),
                value: c.total_out,
                sub: `· ${c.transaction_count} tx`,
              }))}
              formatValue={(n) => money(n)}
            />
          </Panel>
        )}
      </SectionCard>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────

const RENEWAL_WINDOW_DAYS = 30;

export default async function Dashboard({
  teamId,
  isAdmin = false,
  cardFilter,
  basePath,
}: {
  teamId?: string;
  isAdmin?: boolean;
  cardFilter?: string;
  /** Role-prefixed home path (e.g. "/admin"); used for in-dashboard links. */
  basePath: string;
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
        <Banner
          status="warning"
          title="Database not ready"
          description="Start local Supabase (supabase start) and apply the migrations, then reload this page."
          container="card"
        />
      )}

      {/* Stat tiles */}
      <Grid columns={{ minWidth: 200, max: 5 }} gap={3}>
        <StatTile
          label="Active subscriptions"
          value={totals ? String(totals.active_subscriptions) : "—"}
          icon="active"
        />
        <StatTile
          label="Monthly spend"
          value={totals ? money(totals.monthly_spend) : "—"}
          icon="monthly"
        />
        <StatTile
          label="Yearly spend"
          value={totals ? money(totals.yearly_spend) : "—"}
          icon="yearly"
        />
        <StatTile
          label="Needs review"
          value={totals ? String(totals.needs_review_count) : "—"}
          icon="review"
          tone={totals && totals.needs_review_count > 0 ? "amber" : "default"}
          href={`${basePath}/review`}
        />
        <StatTile
          label="Failures last 90 days"
          value={totals ? String(totals.failed_count) : "—"}
          icon="failures"
          tone={totals && totals.failed_count > 0 ? "red" : "default"}
        />
      </Grid>

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
              <Table density="compact">
                <TableHeader>
                  <TableRow isHeaderRow>
                    <TableHeaderCell>Subscription</TableHeaderCell>
                    <TableHeaderCell className="text-right">Amount</TableHeaderCell>
                    <TableHeaderCell>Renews</TableHeaderCell>
                    <TableHeaderCell>Card</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {renewals.map((r) => {
                  const overdue = r.next_renewal_date < today;
                  const isToday = r.next_renewal_date === today;
                  return (
                    <TableRow key={r.subscription_id}>
                      <TableCell>
                        <span className="font-medium text-primary">
                          {r.platform}
                        </span>
                        {r.product && (
                          <span className="ml-1.5 text-secondary">
                            {r.product}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(r.amount, r.currency)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            overdue
                              ? "font-medium text-error"
                              : isToday
                                ? "font-medium text-warning"
                                : undefined
                          }
                        >
                          {formatDate(r.next_renewal_date)}
                        </span>
                        {overdue && (
                          <span className="ml-2 inline-block align-middle">
                            <Badge variant="error" label="Overdue" />
                          </span>
                        )}
                        {isToday && (
                          <span className="ml-2 inline-block align-middle">
                            <Badge variant="warning" label="Today" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-secondary">
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
              <Panel>
                <VStack gap={4}>
                  {spend.map((row) => (
                    <VStack key={row.platform} gap={1.5}>
                      <HStack justify="between" align="end" gap={3}>
                        <Text size="sm" className="truncate font-medium text-primary">
                          {row.platform}
                          <span className="ml-1.5 font-normal text-secondary">
                            · {row.subscription_count}{" "}
                            {row.subscription_count === 1 ? "sub" : "subs"}
                          </span>
                        </Text>
                        <Text size="sm" className="shrink-0 tabular-nums text-secondary">
                          {money(row.monthly_amount)}/mo
                        </Text>
                      </HStack>
                      <ProgressBar
                        label={`${row.platform} monthly spend`}
                        isLabelHidden
                        value={row.monthly_amount}
                        max={maxSpend || 1}
                      />
                    </VStack>
                  ))}
                </VStack>
              </Panel>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
