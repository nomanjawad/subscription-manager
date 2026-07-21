"use client";

// m02-subscriptions — filter controls. Writes filters into the URL search
// params (router.replace); the server component re-queries the database.
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";

const ALL = "all";
const FILTER_KEYS = ["tag", "status", "cycle", "q"] as const;

interface FilterBarProps {
  tags: string[];
}

export function FilterBar({ tags }: FilterBarProps) {
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

  function setParam(key: string, value: string | null): void {
    // Read the live URL, not the render-time snapshot: the debounced "q"
    // write would otherwise clobber a filter chosen while it was pending.
    const params = new URLSearchParams(window.location.search);
    if (value === null || value === "" || value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
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

  const tagOptions = [
    { value: ALL, label: "All tags" },
    ...tags.map((tag) => ({ value: tag, label: tag })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TextInput
        label="Search platform or product"
        isLabelHidden
        type="text"
        value={search}
        onChange={(v) => onSearchChange(v)}
        placeholder="Search platform or product…"
        className="w-56"
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
    </div>
  );
}
