// Thin admin route — mounts the m09-analytics module.
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/auth";
import AnalyticsPanel from "@/modules/m09-analytics/AnalyticsPanel";

// Reads live DB state (RPCs); render per request rather than at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          cross-team &amp; cross-card spend · all teams
        </p>
      </div>
      <AnalyticsPanel />
    </div>
  );
}
