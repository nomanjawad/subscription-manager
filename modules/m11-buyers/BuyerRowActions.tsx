"use client";

// m11-buyers — RemoveBuyerButton: confirm + removeBuyer, used inside the
// (server) Buyers table. useTransition + router.refresh(); errors inline.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { removeBuyer } from "./actions";

export function RemoveBuyerButton({ userId }: { userId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await removeBuyer(userId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't remove buyer.");
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        label="Remove"
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
        label={pending ? "Removing…" : "Confirm"}
        onClick={onRemove}
        isDisabled={pending}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        label="Cancel"
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
