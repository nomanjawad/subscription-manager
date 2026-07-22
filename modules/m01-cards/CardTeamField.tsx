"use client";

// m01-cards — inline team picker for one card row on the admin Cards page.
// Assigning a card to a team makes every transaction on that card count toward
// that team's actual spend. Saves via setCardTeam on change; errors inline.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Selector } from "@astryxdesign/core/Selector";
import type { TeamOption } from "@/lib/types";
import { setCardTeam } from "./actions";

const UNASSIGNED = "none";

export function CardTeamField({
  cardId,
  currentTeamId,
  teams,
}: {
  cardId: string;
  currentTeamId: string | null;
  teams: TeamOption[];
}) {
  const [value, setValue] = useState<string>(currentTeamId ?? UNASSIGNED);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onChange(next: string) {
    setError(null);
    const previous = value;
    setValue(next);
    const teamId = next === UNASSIGNED ? null : next;
    startTransition(async () => {
      try {
        await setCardTeam(cardId, teamId);
        router.refresh();
      } catch (e) {
        setValue(previous); // roll back
        setError(e instanceof Error ? e.message : "Couldn't assign team.");
      }
    });
  }

  const options = [
    { value: UNASSIGNED, label: "Unassigned" },
    ...teams.map((team) => ({ value: team.id, label: team.name })),
  ];

  return (
    <div className="inline-flex flex-col gap-1">
      <Selector
        label="Assign team"
        isLabelHidden
        size="sm"
        placeholder="Assign a team"
        options={options}
        value={value}
        onChange={onChange}
        isDisabled={pending}
        className="w-48"
      />
      {error && (
        <span className="text-xs text-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
