"use client";

// m05-review — manual trigger for the renewal check runner.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending ? "Running…" : "Run renewal checks"}
      </button>
      {result && !isPending ? (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          synced {result.synced} · checks created {result.checksCreated} · renewed{" "}
          {result.renewed} · failed {result.failed} · needs review {result.needsReview}
        </span>
      ) : null}
      {error && !isPending ? (
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </div>
  );
}
