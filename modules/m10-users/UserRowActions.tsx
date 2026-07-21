"use client";

// m10-users — small client action controls used inside the (server) Users
// table:
//   • ReassignUserSelect — inline "assign to a different team lead"
//   • RemoveUserButton    — confirm + removeMember
// Each uses useTransition + router.refresh(); errors surface inline.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import type { LeadOption } from "@/lib/types";
import { reassignMember, removeMember } from "./actions";

const UNASSIGNED = "none";

export function ReassignUserSelect({
  memberId,
  leads,
  currentLeadId,
}: {
  memberId: string;
  leads: LeadOption[];
  currentLeadId: string | null;
}) {
  const [value, setValue] = useState<string>(currentLeadId ?? UNASSIGNED);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onChange(next: string) {
    setError(null);
    const previous = value;
    setValue(next);
    const leadId = next === UNASSIGNED ? null : next;
    startTransition(async () => {
      try {
        await reassignMember(memberId, leadId);
        router.refresh();
      } catch (e) {
        setValue(previous); // roll back
        setError(e instanceof Error ? e.message : "Couldn't reassign.");
      }
    });
  }

  const options = [
    { value: UNASSIGNED, label: "Unassigned" },
    ...leads.map((lead) => ({ value: lead.id, label: lead.label })),
  ];

  return (
    <div className="inline-flex flex-col gap-1">
      <Selector
        label="Reassign team lead"
        isLabelHidden
        size="sm"
        placeholder="Select a team lead"
        options={options}
        value={value}
        onChange={onChange}
        isDisabled={pending}
        className="w-52"
      />
      {error && (
        <span className="text-xs text-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function RemoveUserButton({ memberId }: { memberId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await removeMember(memberId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't remove user.");
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
