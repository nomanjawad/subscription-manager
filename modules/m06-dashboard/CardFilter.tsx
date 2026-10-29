"use client";

// m06-dashboard — card selector for the monthly-spend chart. Writes the choice
// to the ?card= search param so the server re-queries spend_by_month for that
// card (consistent with the app's other DB-side, URL-param filters).
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Selector } from "@astryxdesign/core/Selector";

const ALL = "all";

export function CardFilter({
  cards,
  selected,
}: {
  cards: { id: string; label: string }[];
  selected?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    // Stay on the current dashboard path (role-prefixed); set ?card= and keep
    // the other params (e.g. the expense ?period=).
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete("card");
    else params.set("card", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const options = [
    { value: ALL, label: "All cards" },
    ...cards.map((c) => ({ value: c.id, label: c.label })),
  ];

  return (
    <Selector
      label="Filter by card"
      isLabelHidden
      size="sm"
      placeholder="All cards"
      options={options}
      value={selected ?? ALL}
      onChange={onChange}
      className="w-48"
    />
  );
}
