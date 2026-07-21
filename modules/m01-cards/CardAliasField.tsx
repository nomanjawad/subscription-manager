"use client";

// m01-cards — inline alias editor for one card row on the admin Cards page.
// Controlled TextInput + a Save button that only enables when the value has
// changed. Saves via the setCardAlias server action; errors surface inline.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { setCardAlias } from "./actions";

export function CardAliasField({
  cardId,
  alias,
}: {
  cardId: string;
  alias: string | null;
}) {
  const baseline = alias ?? "";
  const [value, setValue] = useState(baseline);
  const [saved, setSaved] = useState(baseline);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const dirty = value.trim() !== saved.trim();

  function onSave() {
    if (!dirty) return;
    setError(null);
    const next = value.trim();
    startTransition(async () => {
      try {
        await setCardAlias(cardId, next);
        setSaved(next);
        setValue(next);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save alias.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <TextInput
          label="Alias"
          isLabelHidden
          value={value}
          onChange={setValue}
          placeholder="e.g. Backoffice card"
          className="w-56"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          label={pending ? "Saving…" : "Save"}
          onClick={onSave}
          isDisabled={!dirty || pending}
        />
      </div>
      {error && (
        <span className="text-xs text-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
