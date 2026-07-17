// m05-review — the needs-review queue. Async server component.
// Reads only the review_queue view and the candidate_transactions RPC.
import { createServiceClient } from "@/lib/supabase/server";
import type { CandidateTransactionRow, ReviewQueueRow } from "@/lib/types";
import { confirmMatch, markFailed } from "./actions";

async function confirmAction(formData: FormData): Promise<void> {
  "use server";
  const checkId = String(formData.get("checkId") ?? "");
  const transactionId = String(formData.get("transactionId") ?? "");
  const alias = formData.get("alias");
  const learnAlias =
    typeof alias === "string" && alias.trim() !== "" ? alias.trim() : null;
  await confirmMatch(checkId, transactionId, learnAlias);
}

async function markFailedAction(formData: FormData): Promise<void> {
  "use server";
  const checkId = String(formData.get("checkId") ?? "");
  const note = formData.get("note");
  await markFailed(
    checkId,
    typeof note === "string" && note.trim() !== "" ? note.trim() : null,
  );
}

function formatAmount(amount: number, currency: string): string {
  return `${Number(amount).toFixed(2)} ${currency}`;
}

function formatTimestamp(ts: string | null): string {
  return ts ? ts.slice(0, 10) : "—";
}

export default async function ReviewQueue() {
  const supabase = createServiceClient();

  const { data: queueData, error: queueError } = await supabase
    .from("review_queue")
    .select("*");
  if (queueError) {
    throw new Error(`loading review queue: ${queueError.message}`);
  }
  const items = (queueData ?? []) as ReviewQueueRow[];

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-10 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Nothing needs review
      </p>
    );
  }

  const candidates = await Promise.all(
    items.map(async (item) => {
      const { data, error } = await supabase.rpc("candidate_transactions", {
        p_check_id: item.check_id,
      });
      if (error) {
        throw new Error(`loading candidates for check ${item.check_id}: ${error.message}`);
      }
      return (data ?? []) as CandidateTransactionRow[];
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      {items.map((item, index) => (
        <div
          key={item.check_id}
          className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {item.platform}
              {item.product ? (
                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                  {" "}
                  — {item.product}
                </span>
              ) : null}
            </h2>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              expected {formatAmount(item.expected_amount, item.currency)} on{" "}
              {item.expected_date}
              {item.card_last4 ? ` · card ••${item.card_last4}` : ""}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {candidates[index].length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No candidate transactions found in the window.
              </p>
            ) : (
              candidates[index].map((candidate) => (
                <div
                  key={candidate.transaction_id}
                  className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {candidate.counterparty_name ??
                        candidate.bank_description ??
                        "Unknown merchant"}
                    </span>
                    {candidate.bank_description &&
                    candidate.counterparty_name &&
                    candidate.bank_description !== candidate.counterparty_name ? (
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {candidate.bank_description}
                      </span>
                    ) : null}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {formatAmount(Math.abs(Number(candidate.amount)), item.currency)}
                    </span>
                    <span
                      className={
                        candidate.tx_status === "failed"
                          ? "font-semibold text-red-600 dark:text-red-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      }
                    >
                      {candidate.tx_status}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {formatTimestamp(candidate.posted_at)}
                    </span>
                    {candidate.same_card ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        same card
                      </span>
                    ) : null}
                  </div>

                  <form
                    action={confirmAction}
                    className="mt-2 flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="checkId" value={item.check_id} />
                    <input
                      type="hidden"
                      name="transactionId"
                      value={candidate.transaction_id}
                    />
                    <input
                      type="text"
                      name="alias"
                      defaultValue={candidate.counterparty_name ?? ""}
                      placeholder="learn descriptor alias (optional)"
                      className="w-64 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      Confirm
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>

          <form
            action={markFailedAction}
            className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800"
          >
            <input type="hidden" name="checkId" value={item.check_id} />
            <input
              type="text"
              name="note"
              placeholder="failure note (optional)"
              className="w-64 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Mark failed
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
