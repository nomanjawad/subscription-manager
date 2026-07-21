// Dependency-free, theme-aware chart primitives (server-renderable — pure
// SVG/CSS, no client JS). Data volumes here are tiny (a handful of teams/cards,
// ~12 months), so a charting library would be overkill.
import type { ReactNode } from "react";

// Palette chosen to read on both light and dark backgrounds.
export const CHART_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#ec4899", // pink
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthLabel(iso: string, withYear = false): string {
  const [y, m] = iso.split("-").map(Number);
  const name = MONTHS[(m ?? 1) - 1] ?? iso;
  return withYear ? `${name} ${y}` : name;
}

type Formatter = (n: number) => string;

export interface Slice {
  label: string;
  value: number;
}

/** Donut chart with a centred total and a legend. */
export function DonutChart({
  data,
  formatValue = String,
  size = 168,
  thickness = 24,
}: {
  data: Slice[];
  formatValue?: Formatter;
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        role="img"
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={thickness}
            className="stroke-muted"
          />
          {total > 0 &&
            data.map((d, i) => {
              const len = (d.value / total) * circumference;
              const seg = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  strokeWidth={thickness}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-acc}
                />
              );
              acc += len;
              return seg;
            })}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground text-sm font-semibold"
        >
          {formatValue(total)}
        </text>
      </svg>

      <ul className="w-full space-y-1.5">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="truncate text-foreground">{d.label}</span>
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
              {formatValue(d.value)}
              {total > 0 ? ` · ${Math.round((d.value / total) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bar list (label + value + proportional bar). */
export function BarList({
  data,
  formatValue = String,
}: {
  data: { label: string; value: number; sub?: ReactNode }[];
  formatValue?: Formatter;
}) {
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);
  return (
    <ul className="space-y-4">
      {data.map((d, i) => {
        const pct = max > 0 ? Math.max((d.value / max) * 100, 2) : 0;
        return (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-foreground">
                {d.label}
                {d.sub != null && (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {d.sub}
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatValue(d.value)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary/20">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Vertical bars over months (a time-series). */
export function MonthlyBars({
  data,
  formatValue = String,
}: {
  data: { month: string; value: number }[];
  formatValue?: Formatter;
}) {
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);
  return (
    <div className="flex h-44 w-full items-end gap-1.5">
      {data.map((d, i) => {
        const pct =
          max > 0 ? Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0) : 0;
        return (
          <div
            key={i}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-primary transition-colors hover:bg-primary/80"
                style={{ height: `${pct}%` }}
                title={`${monthLabel(d.month, true)}: ${formatValue(d.value)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-muted-foreground">
              {monthLabel(d.month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
