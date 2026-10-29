"use client";

// m02-subscriptions — filter controls. Writes filters into the URL search
// params (router.replace); the server component re-queries the database.
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import {
  DateRangeInput,
  type DateRange,
  type DateRangePreset,
} from "@astryxdesign/core/DateRangeInput";
import type { ISODateString } from "@astryxdesign/core/Calendar";

const ALL = "all";
const FILTER_KEYS = ["tag", "status", "cycle", "q", "card", "from", "to"] as const;

export interface CardOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  tags: string[];
  cards: CardOption[];
}

/** Local calendar date as YYYY-MM-DD. */
function iso(d: Date): ISODateString {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}` as ISODateString;
}

const START_PRESETS: DateRangePreset[] = [
  {
    label: "This month",
    getRange: () => {
      const now = new Date();
      return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now) };
    },
  },
  {
    label: "Last 90 days",
    getRange: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 89);
      return { start: iso(from), end: iso(now) };
    },
  },
  {
    label: "This year",
    getRange: () => {
      const now = new Date();
      return { start: iso(new Date(now.getFullYear(), 0, 1)), end: iso(now) };
    },
  },
];

export function FilterBar({ tags, cards }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function setParams(updates: Record<string, string | null>): void {
    // Read the live URL, not the render-time snapshot: the debounced "q"
    // write would otherwise clobber a filter chosen while it was pending.
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === ALL) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function setParam(key: string, value: string | null): void {
    setParams({ [key]: value });
  }

  function onSearchChange(value: string): void {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam("q", value.trim());
    }, 300);
  }

  function clearAll(): void {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearch("");
    router.replace(pathname);
  }

  const hasFilters = FILTER_KEYS.some((key) => searchParams.get(key));

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const startRange: DateRange | null =
    from && to
      ? { start: from as ISODateString, end: to as ISODateString }
      : null;

  const tagOptions = [
    { value: ALL, label: "All tags" },
    ...tags.map((tag) => ({ value: tag, label: tag })),
  ];

  const cardOptions = [{ value: ALL, label: "All cards" }, ...cards];

  return (
    <HStack gap={2} align="center" wrap="wrap">
      <TextInput
        label="Search platform or product"
        isLabelHidden
        type="text"
        value={search}
        onChange={(v) => onSearchChange(v)}
        placeholder="Search platform or product…"
        className="w-56"
      />

      <DateRangeInput
        label="Start date"
        isLabelHidden
        placeholder="Start date — any"
        value={startRange}
        onChange={(range) =>
          setParams({ from: range?.start ?? null, to: range?.end ?? null })
        }
        presets={START_PRESETS}
        className="w-60"
      />

      <Selector
        label="Filter by card"
        isLabelHidden
        placeholder="All cards"
        options={cardOptions}
        value={searchParams.get("card") ?? ALL}
        onChange={(v) => setParam("card", v)}
        className="w-48"
      />

      <Selector
        label="Filter by status"
        isLabelHidden
        placeholder="All statuses"
        options={[
          { value: ALL, label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        value={searchParams.get("status") ?? ALL}
        onChange={(v) => setParam("status", v)}
        className="w-36"
      />

      <Selector
        label="Filter by tag"
        isLabelHidden
        placeholder="All tags"
        options={tagOptions}
        value={searchParams.get("tag") ?? ALL}
        onChange={(v) => setParam("tag", v)}
        className="w-36"
      />

      <Selector
        label="Filter by billing cycle"
        isLabelHidden
        placeholder="All cycles"
        options={[
          { value: ALL, label: "All cycles" },
          { value: "monthly", label: "Monthly" },
          { value: "yearly", label: "Yearly" },
        ]}
        value={searchParams.get("cycle") ?? ALL}
        onChange={(v) => setParam("cycle", v)}
        className="w-36"
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" label="Clear" onClick={clearAll} />
      )}
    </HStack>
  );
}
