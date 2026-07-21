"use client";

// m07-requests — Approve / Reject buttons for a 'requested' row. Each opens a
// small dialog with an optional note; on success the router refreshes so the
// row moves to its new tab.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
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
    <>
      <Button
        label={isApprove ? "Approve" : "Reject"}
        size="sm"
        variant={isApprove ? "primary" : "destructive"}
        type="button"
        onClick={() => setOpen(true)}
      />
      <Dialog isOpen={open} onOpenChange={setOpen} purpose="form" width={480}>
        <Layout
          header={
            <DialogHeader
              title={isApprove ? "Approve request" : "Reject request"}
              subtitle={
                isApprove
                  ? "The request moves to pending purchase."
                  : "The requester's ask will be closed as rejected."
              }
              onOpenChange={setOpen}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={4}>
                <TextArea
                  label="Note (optional)"
                  rows={3}
                  maxLength={2000}
                  value={note}
                  onChange={setNote}
                  placeholder={
                    isApprove
                      ? "e.g. Approved for the design team"
                      : "e.g. Duplicate of existing subscription"
                  }
                />
                {error ? (
                  <Banner status="error" title={error} container="card" />
                ) : null}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button
                  label="Cancel"
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  isDisabled={pending}
                />
                <Button
                  label={
                    pending ? "Saving…" : isApprove ? "Approve" : "Reject"
                  }
                  type="button"
                  variant={isApprove ? "primary" : "destructive"}
                  onClick={submit}
                  isLoading={pending}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}

export function RequestActions({ requestId }: { requestId: string }) {
  return (
    <HStack gap={2} hAlign="end">
      <ReviewDialog requestId={requestId} mode="approve" />
      <ReviewDialog requestId={requestId} mode="reject" />
    </HStack>
  );
}
