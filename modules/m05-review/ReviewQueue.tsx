// m05-review — the needs-review queue. Async server component.
// Reads only the review_queue view and the candidate_transactions RPC.
// This is a server component, so the confirm/mark-failed forms use native
// inputs (Astryx inputs are client-controlled) styled with design tokens.
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import {
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { createServiceClient } from "@/lib/supabase/server";
import type { CandidateTransactionRow, ReviewQueueRow } from "@/lib/types";
import { confirmMatch, markFailed } from "./actions";
import RunChecksButton from "./RunChecksButton";

interface ReviewQueueProps {
  /** Team scope. Server-enforced; a team lead only sees their team's items. */
  teamId?: string;
  isAdmin: boolean;
}

const INPUT_CLASS =
  "h-8 rounded-md border border-default bg-body px-2 text-sm text-primary placeholder:text-secondary";

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

function statusVariant(status: string): "error" | "warning" | "neutral" {
  if (status === "failed") return "error";
  if (status === "pending") return "warning";
  return "neutral";
}

export default async function ReviewQueue({
  teamId,
  isAdmin,
}: ReviewQueueProps) {
  const supabase = createServiceClient();

  let queueQuery = supabase.from("review_queue").select("*");
  if (teamId) queueQuery = queueQuery.eq("team_id", teamId);
  const { data: queueData, error: queueError } = await queueQuery;
  if (queueError) {
    throw new Error(`loading review queue: ${queueError.message}`);
  }
  const items = (queueData ?? []) as ReviewQueueRow[];

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {isAdmin ? (
          <div className="flex justify-end">
            <RunChecksButton />
          </div>
        ) : null}
        <Card padding={10}>
          <Text as="p" type="supporting" justify="center" className="block">
            Nothing needs review
          </Text>
        </Card>
      </div>
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
      {isAdmin ? (
        <div className="flex justify-end">
          <RunChecksButton />
        </div>
      ) : null}
      {items.map((item, index) => (
        <Card key={item.check_id} padding={0}>
          <div className="px-5 py-4">
            <Heading level={3}>
              {item.platform}
              {item.product ? (
                <span className="font-normal text-secondary"> — {item.product}</span>
              ) : null}
            </Heading>
            <Text type="supporting">
              expected {formatAmount(item.expected_amount, item.currency)} on{" "}
              {item.expected_date}
              {item.card_last4 ? ` · card ••${item.card_last4}` : ""}
            </Text>
          </div>
          <Divider />

          <div className="px-5 py-4">
            {candidates[index].length === 0 ? (
              <Text type="supporting">
                No candidate transactions found in the window.
              </Text>
            ) : (
              <Table density="compact">
                <TableRow isHeaderRow>
                  <TableHeaderCell>Merchant</TableHeaderCell>
                  <TableHeaderCell className="text-right">Amount</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Posted</TableHeaderCell>
                  <TableHeaderCell className="text-right">Confirm</TableHeaderCell>
                </TableRow>
                {candidates[index].map((candidate) => (
                  <TableRow key={candidate.transaction_id}>
                    <TableCell>
                      <span className="font-medium text-primary">
                        {candidate.counterparty_name ??
                          candidate.bank_description ??
                          "Unknown merchant"}
                      </span>
                      {candidate.bank_description &&
                      candidate.counterparty_name &&
                      candidate.bank_description !==
                        candidate.counterparty_name ? (
                        <span className="ml-1.5 text-secondary">
                          {candidate.bank_description}
                        </span>
                      ) : null}
                      {candidate.same_card ? (
                        <span className="ml-1.5 inline-block align-middle">
                          <Badge variant="success" label="same card" />
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(
                        Math.abs(Number(candidate.amount)),
                        item.currency,
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant(candidate.tx_status)}
                        label={candidate.tx_status}
                      />
                    </TableCell>
                    <TableCell className="text-secondary">
                      {formatTimestamp(candidate.posted_at)}
                    </TableCell>
                    <TableCell>
                      <form
                        action={confirmAction}
                        className="flex items-center justify-end gap-2"
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
                          className={`${INPUT_CLASS} w-56`}
                        />
                        <Button type="submit" size="sm" label="Confirm" />
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            )}
          </div>

          <Divider />
          <div className="px-5 py-4">
            <form
              action={markFailedAction}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="checkId" value={item.check_id} />
              <input
                type="text"
                name="note"
                placeholder="failure note (optional)"
                className={`${INPUT_CLASS} w-64`}
              />
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                label="Mark failed"
              />
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}
