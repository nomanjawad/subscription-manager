"use client";

// m08-teams — small client action controls used inside the (server) tables:
//   • DeleteTeamButton  — confirm + deleteTeam
//   • RemoveLeadButton  — confirm + removeTeamLead
//   • ReassignLeadSelect — inline team reassignment for a lead
// Each uses useTransition + router.refresh(); errors surface inline.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import type { TeamOption } from "@/lib/types";
import { deleteTeam, reassignTeamLead, removeTeamLead } from "./actions";

const UNASSIGNED = "none";

export function DeleteTeamButton({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteTeam(teamId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't delete team.");
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
        label="Delete"
        onClick={() => setConfirming(true)}
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-secondary">Delete “{teamName}”?</span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        label={pending ? "Deleting…" : "Confirm"}
        onClick={onDelete}
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

export function RemoveLeadButton({ userId }: { userId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await removeTeamLead(userId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't remove lead.");
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

export function ReassignLeadSelect({
  userId,
  teams,
  currentTeamId,
}: {
  userId: string;
  teams: TeamOption[];
  currentTeamId: string | null;
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
        await reassignTeamLead(userId, teamId);
        router.refresh();
      } catch (e) {
        setValue(previous); // roll back
        setError(e instanceof Error ? e.message : "Couldn't reassign.");
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
        label="Reassign team"
        isLabelHidden
        size="sm"
        placeholder="Select a team"
        options={options}
        value={value}
        onChange={onChange}
        isDisabled={pending}
        className="w-40"
      />
      {error && (
        <span className="text-xs text-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
