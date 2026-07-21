"use client";

// A button that navigates via next/link. Astryx's Button accepts `as={Link}`,
// but a component (function) can't be passed as a prop from a Server Component
// to a Client Component — so this thin client wrapper holds the Link reference
// on the client side and takes only serializable props from server callers.
import Link from "next/link";
import { Button } from "@astryxdesign/core/Button";

export function LinkButton({
  href,
  label,
  variant = "secondary",
  size = "md",
}: {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}) {
  return <Button as={Link} href={href} label={label} variant={variant} size={size} />;
}
