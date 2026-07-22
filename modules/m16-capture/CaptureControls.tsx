"use client";

// m16-capture — pick a card + month and pull that statement from the bank.
// On success it navigates to /capture?card=&period= so the server re-renders
// the charge list for that selection.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Selector } from "@astryxdesign/core/Selector";
import { captureCardStatement } from "./actions";
import type { CapturePeriod } from "./queries";

interface CardOption {
  value: string;
  label: string;
}

export function CaptureControls({
  cards,
  currentCardId,
  currentPeriod,
}: {
  cards: CardOption[];
  currentCardId?: string;
  currentPeriod: CapturePeriod;
}) {
  const router = useRouter();
  const [cardId, setCardId] = useState(currentCardId ?? cards[0]?.value ?? "");
  const [period, setPeriod] = useState<string>(currentPeriod);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onCapture() {
    setError(null);
    if (!cardId) {
      setError("Choose a card first.");
      return;
    }
    start(async () => {
      try {
        await captureCardStatement(cardId, period as CapturePeriod);
        router.push(`/capture?card=${cardId}&period=${period}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't capture the statement.");
      }
    });
  }

  return (
    <Card padding={5}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <Selector
          label="Card"
          value={cardId}
          onChange={setCardId}
          options={cards}
        />
        <Selector
          label="Statement month"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "this", label: "This month" },
            { value: "last", label: "Last month" },
          ]}
        />
        <Button
          type="button"
          variant="primary"
          label={pending ? "Capturing…" : "Capture statement"}
          onClick={onCapture}
          isLoading={pending}
          isDisabled={cards.length === 0}
        />
      </div>
      {error && (
        <div className="mt-4">
          <Banner status="error" title={error} container="card" />
        </div>
      )}
    </Card>
  );
}
