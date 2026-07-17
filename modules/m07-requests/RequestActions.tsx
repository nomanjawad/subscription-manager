"use client";

// m07-requests — Approve / Reject buttons for a 'requested' row. Each opens a
// small dialog with an optional note; on success the router refreshes so the
// row moves to its new tab.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { approveRequest, rejectRequest } from "./actions";

interface ReviewDialogProps {
  requestId: string;
  mode: "approve" | "reject";
}

function ReviewDialog({ requestId, mode }: ReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isApprove = mode === "approve";

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const action = isApprove ? approveRequest : rejectRequest;
        await action(requestId, note.trim() === "" ? null : note.trim());
        setOpen(false);
        setNote("");
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Something went wrong. Try again.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={isApprove ? "default" : "destructive"}
          type="button"
        >
          {isApprove ? "Approve" : "Reject"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isApprove ? "Approve request" : "Reject request"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? "The request moves to pending purchase."
              : "The requester's ask will be closed as rejected."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor={`note-${mode}-${requestId}`}>Note (optional)</Label>
          <Textarea
            id={`note-${mode}-${requestId}`}
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isApprove ? "e.g. Approved for the design team" : "e.g. Duplicate of existing subscription"
            }
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isApprove ? "default" : "destructive"}
            onClick={submit}
            disabled={pending}
          >
            {pending
              ? "Saving…"
              : isApprove
                ? "Approve"
                : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RequestActions({ requestId }: { requestId: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <ReviewDialog requestId={requestId} mode="approve" />
      <ReviewDialog requestId={requestId} mode="reject" />
    </div>
  );
}
