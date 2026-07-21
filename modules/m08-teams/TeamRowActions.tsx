"use client";

// m08-teams — small client action controls used inside the (server) tables:
//   • DeleteTeamButton  — confirm + deleteTeam
//   • RemoveLeadButton  — confirm + removeTeamLead
//   • ReassignLeadSelect — inline team reassignment for a lead
// Each uses useTransition + router.refresh(); errors surface inline.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        Delete “{teamName}”?
      </span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onDelete}
        disabled={pending}
      >
        {pending ? "Deleting…" : "Confirm"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        Cancel
      </Button>
      {error && (
        <span className="text-xs text-destructive" role="alert">
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
        onClick={() => setConfirming(true)}
      >
        Remove
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onRemove}
        disabled={pending}
      >
        {pending ? "Removing…" : "Confirm"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        Cancel
      </Button>
      {error && (
        <span className="text-xs text-destructive" role="alert">
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

  return (
    <div className="inline-flex flex-col gap-1">
      <Select value={value} onValueChange={onChange} disabled={pending}>
        <SelectTrigger className="w-40" size="sm">
          <SelectValue placeholder="Select a team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
