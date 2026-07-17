// m01-cards — presentational card <select>. Plain component (no "use client"):
// it renders inside whatever <form> mounts it and carries no state of its own.
import type { CardRow } from "@/lib/types";

interface CardPickerProps {
  cards: CardRow[];
  name: string;
  defaultValue?: string | null;
}

function cardLabel(card: CardRow): string {
  const label = card.nickname ?? card.name_on_card ?? "Card";
  const type = card.card_type ? ` (${card.card_type})` : "";
  return `${label} ••${card.last4}${type}`;
}

export function CardPicker({ cards, name, defaultValue }: CardPickerProps) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
    >
      <option value="">— no card —</option>
      {cards.map((card) => (
        <option key={card.id} value={card.id}>
          {cardLabel(card)}
        </option>
      ))}
    </select>
  );
}
