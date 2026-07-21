// m09-analytics — admin-only, async server component. Data comes exclusively
// from the three RPCs in ./queries.ts; all aggregation happens in Postgres.
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { DonutChart } from "@/components/charts/Charts";
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
  default: "text-primary",
  amber: "text-warning",
  red: "text-error",
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
    <Card padding={4} className="h-full">
      <VStack gap={1}>
        <Text type="supporting">{label}</Text>
        <Text size="2xl" weight="semibold" className={VALUE_TONE[tone]}>
          {value}
        </Text>
      </VStack>
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
    <Card padding={0} className="h-full">
      <div className="px-5 py-4">
        <Heading level={3}>{title}</Heading>
      </div>
      <Divider />
      {children}
    </Card>
  );
}

/** Padded content region inside a SectionCard (tables render full-bleed). */
function Panel({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-4">{children}</div>;
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

// ── AnalyticsPanel ─────────────────────────────────────────────────────────

export default async function AnalyticsPanel() {
  const [totals, byTeam, byCard] = await Promise.all([
    getOverallTotals(),
    getSpendByTeam(),
    getSpendByCard(),
  ]);

  const totalTeamSpend = byTeam.reduce((sum, r) => sum + r.monthly_amount, 0);

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
        {/* Spend by team — which team spent how much (share of monthly cost) */}
        <SectionCard title="Spend by team">
          {byTeam.length === 0 ? (
            <EmptyState>No team spend to report yet.</EmptyState>
          ) : (
            <Panel>
              <VStack gap={4}>
                <DonutChart
                  data={byTeam.map((row) => ({
                    label: `${row.team_name} · ${row.subscription_count} ${
                      row.subscription_count === 1 ? "sub" : "subs"
                    }`,
                    value: row.monthly_amount,
                  }))}
                  formatValue={(n) => money(n)}
                />
                <Text as="p" type="supporting" className="block">
                  Normalized monthly subscription cost ·{" "}
                  {money(totalTeamSpend)}/mo across all teams.
                </Text>
              </VStack>
            </Panel>
          )}
        </SectionCard>

        {/* Spend across all cards */}
        <SectionCard title="Spend across all cards">
          {byCard.length === 0 ? (
            <EmptyState>No card transactions synced yet.</EmptyState>
          ) : (
            <>
              <Table density="compact">
                <TableRow isHeaderRow>
                  <TableHeaderCell>Card</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    Total spent
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    Transactions
                  </TableHeaderCell>
                </TableRow>
                {byCard.map((row) => (
                  <TableRow key={row.mercury_card_id}>
                    <TableCell className="font-medium text-primary">
                      {cardLabel(row)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.total_out)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-secondary">
                      {row.transaction_count}
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
              <Panel>
                <Text as="p" type="supporting" className="block">
                  Covers all synced Mercury transactions, not only subscription
                  renewals.
                </Text>
              </Panel>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
