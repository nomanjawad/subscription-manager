"use client";

// m10-users — team-lead picker that submits inside a plain <form>. Astryx's
// Selector is controlled and won't post a value on its own, so (as with
// TeamPicker) a hidden input mirrors the selected lead id into the FormData.
import { useState } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import type { LeadOption } from "@/lib/types";

interface LeadPickerProps {
  leads: LeadOption[];
  name?: string;
  required?: boolean;
  placeholder?: string;
}

export function LeadPicker({
  leads,
  name = "lead_id",
  required = false,
  placeholder = "Select a team lead",
}: LeadPickerProps) {
  const [value, setValue] = useState<string>("");

  const options = leads.map((lead) => ({ value: lead.id, label: lead.label }));

  return (
    <>
      <input type="hidden" name={name} value={value} required={required} />
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
