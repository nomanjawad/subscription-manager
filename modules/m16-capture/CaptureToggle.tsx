"use client";

// m16-capture — turn the whole Capture feature on/off. Admins switch it off once
// every live subscription has been mapped from the statements.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { setCaptureEnabled } from "./actions";

export function CaptureToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onToggle() {
    setError(null);
    start(async () => {
      try {
        await setCaptureEnabled(!enabled);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't update the setting.");
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-3">
      <Button
        type="button"
        variant={enabled ? "secondary" : "primary"}
        size="sm"
        label={
          pending
            ? "Saving…"
            : enabled
              ? "Turn capture off"
              : "Turn capture on"
        }
        onClick={onToggle}
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
