// m06-dashboard — async server component. Data comes exclusively from the
// three RPCs in ./queries.ts; all aggregation happens in Postgres.
import Link from "next/link";
import {
  getDashboardTotals,
  getSpendByPlatform,
  getUpcomingRenewals,
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
  default: "text-zinc-900 dark:text-zinc-50",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
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
    <>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-semibold tracking-tight ${VALUE_TONE[tone]}`}>
        {value}
      </p>
    </>
  );
  const card =
    "block rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";
  if (href) {
    return (
      <Link
        href={href}
        className={`${card} transition-colors hover:border-zinc-300 dark:hover:border-zinc-700`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={card}>{inner}</div>;
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="border-b border-zinc-200 px-5 py-3.5 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
      {children}
    </p>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────

const RENEWAL_WINDOW_DAYS = 30;

export default async function Dashboard() {
  const [totals, renewals, spend] = await Promise.all([
    getDashboardTotals(),
    getUpcomingRenewals(RENEWAL_WINDOW_DAYS),
    getSpendByPlatform(),
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

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upcoming renewals */}
        <div className="lg:col-span-3">
          <SectionCard title={`Upcoming renewals (${RENEWAL_WINDOW_DAYS} days)`}>
            {renewals.length === 0 ? (
              <EmptyState>
                No renewals due in the next {RENEWAL_WINDOW_DAYS} days.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                      <th className="px-5 py-2.5 font-medium">Subscription</th>
                      <th className="px-5 py-2.5 text-right font-medium">
                        Amount
                      </th>
                      <th className="px-5 py-2.5 font-medium">Renews</th>
                      <th className="px-5 py-2.5 font-medium">Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {renewals.map((r) => {
                      const overdue = r.next_renewal_date < today;
                      const isToday = r.next_renewal_date === today;
                      return (
                        <tr key={r.subscription_id}>
                          <td className="px-5 py-3">
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">
                              {r.platform}
                            </span>
                            {r.product && (
                              <span className="ml-1.5 text-zinc-500 dark:text-zinc-400">
                                {r.product}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                            {money(r.amount, r.currency)}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span
                              className={
                                overdue
                                  ? "font-medium text-red-600 dark:text-red-400"
                                  : isToday
                                    ? "font-medium text-amber-600 dark:text-amber-400"
                                    : "text-zinc-700 dark:text-zinc-300"
                              }
                            >
                              {formatDate(r.next_renewal_date)}
                            </span>
                            {overdue && (
                              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                Overdue
                              </span>
                            )}
                            {isToday && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                Today
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                            {r.card_last4 ? `•••• ${r.card_last4}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Spend by platform */}
        <div className="lg:col-span-2">
          <SectionCard title="Spend by platform">
            {spend.length === 0 ? (
              <EmptyState>No active subscriptions yet.</EmptyState>
            ) : (
              <ul className="space-y-4 px-5 py-4">
                {spend.map((row) => {
                  const pct =
                    maxSpend > 0
                      ? Math.max((row.monthly_amount / maxSpend) * 100, 2)
                      : 0;
                  return (
                    <li key={row.platform}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {row.platform}
                          <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                            · {row.subscription_count}{" "}
                            {row.subscription_count === 1 ? "sub" : "subs"}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-zinc-700 dark:text-zinc-300">
                          {money(row.monthly_amount)}/mo
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-r bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-r bg-zinc-700 dark:bg-zinc-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
