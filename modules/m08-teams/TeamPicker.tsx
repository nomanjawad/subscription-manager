"use client";

// m08-teams — team picker that submits inside a plain <form>.
// PUBLIC CONTRACT — consumed by the request form and SubscriptionForm; keep
// props and the hidden-input submission behaviour stable.
//
// Astryx Selector is controlled and won't post a value on its own, so (as with
// m01 CardPicker) we drive a hidden input from the selected value. The
// "Unassigned" option uses a sentinel ("none") that maps to an empty string in
// the submitted field.
import { useState } from "react";
import { Selector } from "@astryxdesign/core/Selector";
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
  // Selector value: sentinel for unassigned, else the team id (or "" = nothing).
  const [value, setValue] = useState<string>(() => {
    if (defaultValue) return defaultValue;
    return includeUnassigned ? UNASSIGNED : "";
  });

  // The hidden field carries the real submitted value: "" for unassigned.
  const submitted = value === UNASSIGNED ? "" : value;

  const options = [
    ...(includeUnassigned ? [{ value: UNASSIGNED, label: "Unassigned" }] : []),
    ...teams.map((team) => ({ value: team.id, label: team.name })),
  ];

  return (
    <>
      <input type="hidden" name={name} value={submitted} required={required} />
      <Selector
        label={placeholder}
        isLabelHidden
        placeholder={placeholder}
        options={options}
        value={value || undefined}
        onChange={setValue}
        isRequired={required}
      />
    </>
  );
}
