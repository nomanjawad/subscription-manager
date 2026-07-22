"use client";

// m13-cancellations — buyer/admin action to finalize a pending cancellation.
// Confirm → completeCancellation → refresh. Errors inline.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { completeCancellation } from "./actions";

export function CompleteCancellationButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onComplete() {
    setError(null);
    startTransition(async () => {
      try {
        await completeCancellation(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't complete.");
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="primary"
        size="sm"
        label="Mark cancelled"
        onClick={() => setConfirming(true)}
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        label={pending ? "Cancelling…" : "Confirm"}
        onClick={onComplete}
        isDisabled={pending}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        label="Keep"
        onClick={() => setConfirming(false)}
        isDisabled={pending}
      />
      {error && (
        <span className="text-xs text-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
