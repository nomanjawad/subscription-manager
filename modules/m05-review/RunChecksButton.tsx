"use client";

// m05-review — manual trigger for the renewal check runner.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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
      <Button type="button" onClick={handleClick} disabled={isPending}>
        {isPending ? "Running…" : "Run renewal checks"}
      </Button>
      {result && !isPending ? (
        <span className="text-sm text-muted-foreground">
          synced {result.synced} · checks created {result.checksCreated} · renewed{" "}
          {result.renewed} · failed {result.failed} · needs review {result.needsReview}
        </span>
      ) : null}
      {error && !isPending ? (
        <span className="text-sm text-destructive">{error}</span>
      ) : null}
    </div>
  );
}
