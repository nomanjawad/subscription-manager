"use client";

// m01-cards — presentational card selector (Astryx). The public contract is the
// hidden `<input name={name}>` submission: this component is dropped inside a
// host <form> (SubscriptionForm, PurchaseDialog) and must submit the chosen card
// id under `name`, exactly like the previous native <select>. The Astryx
// Selector is controlled, so we mirror its value into a hidden input.
import { useState } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import type { CardRow } from "@/lib/types";

interface CardPickerProps {
  cards: CardRow[];
  name?: string;
  defaultValue?: string | null;
}

const NO_CARD = "";

function cardLabel(card: CardRow): string {
  const label = card.nickname ?? card.name_on_card ?? "Card";
  const type = card.card_type ? ` (${card.card_type})` : "";
  return `${label} ••${card.last4}${type}`;
}

export function CardPicker({
  cards,
  name = "card_id",
  defaultValue,
}: CardPickerProps) {
  const [value, setValue] = useState(defaultValue ?? NO_CARD);

  const options = [
    { value: NO_CARD, label: "— no card —" },
    ...cards.map((card) => ({ value: card.id, label: cardLabel(card) })),
  ];

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Selector
        label="Card"
        isLabelHidden
        placeholder="— no card —"
        options={options}
        value={value}
        onChange={(next) => setValue(next)}
        className="w-full"
      />
    </>
  );
}
