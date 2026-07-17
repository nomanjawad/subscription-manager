// Date-string (YYYY-MM-DD) arithmetic for the renewal check runner.
// ISO date strings compare correctly with plain string comparison.
import type { BillingCycle } from "@/lib/types";

function format(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Today's date in the server's local timezone, as YYYY-MM-DD. */
export function todayISO(): string {
  const now = new Date();
  return format(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Add (or subtract) whole days to a YYYY-MM-DD date string. */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return format(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * Advance a YYYY-MM-DD date by one billing cycle (monthly +1 month,
 * yearly +1 year), clamping the day to the target month's length
 * (Jan 31 → Feb 28, Feb 29 → Feb 28 next year).
 */
export function advanceOneCycle(dateISO: string, cycle: BillingCycle): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const targetYear = cycle === "yearly" ? y + 1 : m === 12 ? y + 1 : y;
  const targetMonth = cycle === "yearly" ? m : m === 12 ? 1 : m + 1;
  const daysInTarget = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return format(targetYear, targetMonth, Math.min(d, daysInTarget));
}
