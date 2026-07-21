"use client";

// m06-dashboard — card selector for the monthly-spend chart. Writes the choice
// to the ?card= search param so the server re-queries spend_by_month for that
// card (consistent with the app's other DB-side, URL-param filters).
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

export function CardFilter({
  cards,
  selected,
}: {
  cards: { id: string; label: string }[];
  selected?: string;
}) {
  const router = useRouter();

  function onChange(value: string) {
    router.push(value === ALL ? "/" : `/?card=${encodeURIComponent(value)}`);
  }

  return (
    <Select value={selected ?? ALL} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-48">
        <SelectValue placeholder="All cards" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All cards</SelectItem>
        {cards.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
