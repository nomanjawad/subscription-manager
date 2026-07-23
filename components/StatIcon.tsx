"use client";

// Client wrapper that maps a serializable icon id → a Lucide icon and renders it
// through Astryx's Icon. Server components (e.g. the Dashboard) can't pass a
// component reference across the client boundary — React only allows plain,
// serializable props — so only the string `id` crosses; the component lookup
// happens here on the client.
import { Icon, type IconType } from "@astryxdesign/core/Icon";
import {
  Layers,
  Wallet,
  TrendingUp,
  ClipboardList,
  TriangleAlert,
} from "lucide-react";

const ICONS = {
  active: Layers,
  monthly: Wallet,
  yearly: TrendingUp,
  review: ClipboardList,
  failures: TriangleAlert,
} as const;

export type StatIconId = keyof typeof ICONS;

export function StatIcon({
  id,
  color,
}: {
  id: StatIconId;
  color: "accent" | "warning" | "error";
}) {
  const LucideGlyph = ICONS[id];
  return <Icon icon={LucideGlyph as unknown as IconType} color={color} size="md" />;
}
