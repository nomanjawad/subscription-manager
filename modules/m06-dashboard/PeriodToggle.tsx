"use client";

// m06-dashboard — Week / Month / Year toggle for the expense lists. Writes
// ?period= (keeping other params, e.g. ?card=) so the server re-queries.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import type { SpendPeriod } from "@/lib/types";

const PERIODS: { value: SpendPeriod; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function PeriodToggle({ period }: { period: SpendPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string | null | string[]): void {
    if (typeof value !== "string" || value === period) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "month") params.delete("period");
    else params.set("period", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <ToggleButtonGroup
      label="Expense period"
      type="single"
      size="sm"
      value={period}
      onChange={onChange}
    >
      {PERIODS.map((p) => (
        <ToggleButton key={p.value} value={p.value} label={p.label}>
          {p.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
