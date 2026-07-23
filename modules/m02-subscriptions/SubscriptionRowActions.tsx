"use client";

// m02-subscriptions — compact row actions for the subscriptions table. Collapses
// Edit / Request cancellation / Reactivate into a single ⋯ overflow menu so the
// action column stays narrow and the table no longer feels congested. Mutations
// run through the existing server actions via useTransition; a failure surfaces
// as a small inline message under the trigger.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon, type IconType } from "@astryxdesign/core/Icon";
import { Pencil, Ban, RotateCcw } from "lucide-react";
import type { SubscriptionOverviewRow } from "@/lib/types";
import { requestCancellation } from "@/modules/m13-cancellations/actions";
import { reactivateSubscription } from "./actions";

// lucide forward-ref components are structurally SVG icon components; bridge to
// Astryx's IconType (resolved from its own React copy) at the boundary.
const asIcon = (glyph: unknown) => glyph as unknown as IconType;

type ActionItem = {
  label: string;
  icon?: IconType;
  onClick?: () => void;
  isDisabled?: boolean;
};

export function SubscriptionRowActions({
  id,
  status,
  cancellationPending,
  editHref,
}: {
  id: string;
  status: SubscriptionOverviewRow["status"];
  cancellationPending: boolean;
  editHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const items: ActionItem[] = [
    { label: "Edit", icon: asIcon(Pencil), onClick: () => router.push(editHref) },
  ];

  if (status === "active") {
    if (cancellationPending) {
      items.push({ label: "Cancellation pending", isDisabled: true });
    } else {
      items.push({
        label: "Request cancellation",
        icon: asIcon(Ban),
        onClick: () => run(() => requestCancellation(id)),
      });
    }
  } else {
    items.push({
      label: "Reactivate",
      icon: asIcon(RotateCcw),
      onClick: () => run(() => reactivateSubscription(id)),
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <DropdownMenu
        hasChevron={false}
        menuWidth={220}
        button={{
          variant: "ghost",
          size: "sm",
          isIconOnly: true,
          label: "Row actions",
          icon: <Icon icon="moreHorizontal" />,
          isLoading: pending,
        }}
        items={items}
      />
      {error ? (
        <span className="max-w-52 text-right text-xs text-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
