"use client";

// m05-review — manual trigger for the renewal check runner.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { runChecksAction } from "./actions";
import type { RunRenewalChecksResult } from "./runner";

export default function RunChecksButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RunRenewalChecksResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick(): void {
    startTransition(async () => {
      setError(null);
      try {
        const counters = await runChecksAction();
        setResult(counters);
        router.refresh();
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : "Renewal check run failed");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        label={isPending ? "Running…" : "Run renewal checks"}
        type="button"
        variant="primary"
        onClick={handleClick}
        isLoading={isPending}
        isDisabled={isPending}
      />
      {result && !isPending ? (
        <Text type="supporting">
          synced {result.synced} · checks created {result.checksCreated} · renewed{" "}
          {result.renewed} · failed {result.failed} · needs review{" "}
          {result.needsReview}
        </Text>
      ) : null}
      {error && !isPending ? (
        <Text type="supporting" className="text-error">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
