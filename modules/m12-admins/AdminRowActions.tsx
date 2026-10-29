"use client";

// m12-admins — RemoveAdminButton: confirm + removeAdmin, used inside the
// (server) Admins table. useTransition + router.refresh(); errors inline.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { removeAdmin } from "./actions";

export function RemoveAdminButton({ userId }: { userId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await removeAdmin(userId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't remove admin.");
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
