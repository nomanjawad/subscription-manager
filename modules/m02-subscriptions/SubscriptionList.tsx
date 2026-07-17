// m02-subscriptions — async server component. Reads the subscription_overview
// view (the sanctioned cross-table read); ordering happens in the DB query.
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { CheckStatus, SubscriptionOverviewRow } from "@/lib/types";
import { cancelSubscription, reactivateSubscription } from "./actions";

const badgeBase =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

function StatusBadge({ status }: { status: SubscriptionOverviewRow["status"] }) {
  if (status === "active") {
    return (
      <span
        className={`${badgeBase} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}
      >
        active
      </span>
    );
  }
  return (
    <span
      className={`${badgeBase} bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`}
    >
      cancelled
    </span>
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
      return (
        <span
          className={`${badgeBase} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}
        >
          renewed
        </span>
      );
    case "failed":
      return (
        <span
          title={failureReason ?? undefined}
          className={`${badgeBase} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`}
        >
          failed
        </span>
      );
    case "needs_review":
      return (
        <span
          className={`${badgeBase} bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200`}
        >
          needs review
        </span>
      );
    case "pending":
      return (
        <span
          className={`${badgeBase} bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`}
        >
          pending
        </span>
      );
    default:
      return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
  }
}

function cardLabel(row: SubscriptionOverviewRow): string {
  if (!row.card_id) return "—";
  const name = row.card_nickname ?? row.card_name ?? "Card";
  return row.card_last4 ? `${name} ••${row.card_last4}` : name;
}

export async function SubscriptionList() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subscription_overview")
    .select("*")
    .order("next_renewal_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to load subscriptions: ${error.message}`);
  }
  const rows = (data ?? []) as SubscriptionOverviewRow[];

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No subscriptions yet — add the first one above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <th className="px-4 py-3 font-medium">Platform</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Next renewal</th>
            <th className="px-4 py-3 font-medium">Card</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Last check</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {row.platform}
                </div>
                {row.product && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {row.product}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {Number(row.amount).toFixed(2)} {row.currency}
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {" "}
                  / {row.billing_cycle === "monthly" ? "mo" : "yr"}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {row.next_renewal_date}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{cardLabel(row)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3">
                <CheckBadge
                  status={row.last_check_status}
                  failureReason={row.last_check_failure_reason}
                />
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <div className="inline-flex items-center gap-3">
                  <Link
                    href={`/subscriptions?edit=${row.id}`}
                    className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white underline underline-offset-2"
                  >
                    Edit
                  </Link>
                  {row.status === "active" ? (
                    <form action={cancelSubscription.bind(null, row.id)}>
                      <button
                        type="submit"
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline underline-offset-2"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <form action={reactivateSubscription.bind(null, row.id)}>
                      <button
                        type="submit"
                        className="text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 underline underline-offset-2"
                      >
                        Reactivate
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
