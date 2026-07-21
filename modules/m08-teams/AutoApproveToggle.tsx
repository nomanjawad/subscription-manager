"use client";

// m08-teams — inline auto-approve switch for a team row. Optimistically flips
// the visible state, calls setAutoApprove, and refreshes on success; on
// failure it rolls back and shows an inline error.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@astryxdesign/core/Switch";
import { setAutoApprove } from "./actions";

interface AutoApproveToggleProps {
  teamId: string;
  value: boolean;
}

export function AutoApproveToggle({ teamId, value }: AutoApproveToggleProps) {
  const [checked, setChecked] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onChange(next: boolean) {
    setError(null);
    setChecked(next); // optimistic
    startTransition(async () => {
      try {
        await setAutoApprove(teamId, next);
        router.refresh();
      } catch (e) {
        setChecked(!next); // roll back
        setError(
          e instanceof Error ? e.message : "Couldn't update. Try again.",
        );
      }
    });
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <Switch
        label="Auto-approve requests for this team"
        isLabelHidden
        value={checked}
        onChange={(next) => onChange(next)}
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
