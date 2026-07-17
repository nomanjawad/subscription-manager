// m05-review — the needs-review queue. Async server component.
// Reads only the review_queue view and the candidate_transactions RPC.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function statusBadgeVariant(
  status: string,
): "destructive" | "outline" | "secondary" {
  if (status === "failed") return "destructive";
  if (status === "pending") return "outline";
  return "secondary";
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
      <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
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
        <Card key={item.check_id}>
          <CardHeader className="border-b">
            <CardTitle>
              {item.platform}
              {item.product ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  — {item.product}
                </span>
              ) : null}
            </CardTitle>
            <CardDescription>
              expected {formatAmount(item.expected_amount, item.currency)} on{" "}
              {item.expected_date}
              {item.card_last4 ? ` · card ••${item.card_last4}` : ""}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {candidates[index].length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No candidate transactions found in the window.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs text-muted-foreground">
                      Merchant
                    </TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Posted
                    </TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">
                      Confirm
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates[index].map((candidate) => (
                    <TableRow key={candidate.transaction_id}>
                      <TableCell className="whitespace-normal py-3">
                        <span className="font-medium text-foreground">
                          {candidate.counterparty_name ??
                            candidate.bank_description ??
                            "Unknown merchant"}
                        </span>
                        {candidate.bank_description &&
                        candidate.counterparty_name &&
                        candidate.bank_description !==
                          candidate.counterparty_name ? (
                          <span className="ml-1.5 text-muted-foreground">
                            {candidate.bank_description}
                          </span>
                        ) : null}
                        {candidate.same_card ? (
                          <Badge
                            variant="secondary"
                            className="ml-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          >
                            same card
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums">
                        {formatAmount(
                          Math.abs(Number(candidate.amount)),
                          item.currency,
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant={statusBadgeVariant(candidate.tx_status)}>
                          {candidate.tx_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-muted-foreground">
                        {formatTimestamp(candidate.posted_at)}
                      </TableCell>
                      <TableCell className="py-3">
                        <form
                          action={confirmAction}
                          className="flex items-center justify-end gap-2"
                        >
                          <input
                            type="hidden"
                            name="checkId"
                            value={item.check_id}
                          />
                          <input
                            type="hidden"
                            name="transactionId"
                            value={candidate.transaction_id}
                          />
                          <Input
                            type="text"
                            name="alias"
                            defaultValue={candidate.counterparty_name ?? ""}
                            placeholder="learn descriptor alias (optional)"
                            className="h-8 w-56"
                          />
                          <Button type="submit" size="sm">
                            Confirm
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>

          <CardFooter>
            <form
              action={markFailedAction}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="checkId" value={item.check_id} />
              <Input
                type="text"
                name="note"
                placeholder="failure note (optional)"
                className="h-8 w-64"
              />
              <Button type="submit" variant="destructive" size="sm">
                Mark failed
              </Button>
            </form>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
