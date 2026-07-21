"use client";

// m08-teams — team <Select> that submits inside a plain <form>.
// PUBLIC CONTRACT — consumed by the request form; keep props stable.
//
// Radix Select won't post a value on its own and its item values must be
// non-empty, so (following m01 CardPicker's approach) we drive a hidden input
// from the selected value. The "Unassigned" option uses a sentinel value
// ("none") that maps to an empty string in the submitted field.
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamOption } from "@/lib/types";

const UNASSIGNED = "none";

interface TeamPickerProps {
  teams: TeamOption[];
  name?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  includeUnassigned?: boolean;
}

export function TeamPicker({
  teams,
  name = "team_id",
  required = false,
  defaultValue,
  placeholder = "Select a team",
  includeUnassigned = false,
}: TeamPickerProps) {
  // Radix value: sentinel for unassigned, else the team id (or "" = nothing).
  const [value, setValue] = useState<string>(() => {
    if (defaultValue) return defaultValue;
    return includeUnassigned ? UNASSIGNED : "";
  });

  // The hidden field carries the real submitted value: "" for unassigned.
  const submitted = value === UNASSIGNED ? "" : value;

  return (
    <>
      <input type="hidden" name={name} value={submitted} required={required} />
      <Select value={value || undefined} onValueChange={setValue}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeUnassigned && (
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          )}
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
