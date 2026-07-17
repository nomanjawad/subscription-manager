"use client";

// m02-subscriptions — filter controls. Writes filters into the URL search
// params (router.replace); the server component re-queries the database.
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search platform or product…"
        className="w-56"
        aria-label="Search platform or product"
      />

      <Select
        value={searchParams.get("tag") ?? ALL}
        onValueChange={(value) => setParam("tag", value)}
      >
        <SelectTrigger className="w-36" aria-label="Filter by tag">
          <SelectValue placeholder="All tags" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All tags</SelectItem>
          {tags.map((tag) => (
            <SelectItem key={tag} value={tag}>
              {tag}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? ALL}
        onValueChange={(value) => setParam("status", value)}
      >
        <SelectTrigger className="w-36" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("cycle") ?? ALL}
        onValueChange={(value) => setParam("cycle", value)}
      >
        <SelectTrigger className="w-36" aria-label="Filter by billing cycle">
          <SelectValue placeholder="All cycles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All cycles</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="yearly">Yearly</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Clear
        </Button>
      )}
    </div>
  );
}
