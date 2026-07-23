// Thin admin route — mounts the m09-analytics module.
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/auth";
import AnalyticsPanel from "@/modules/m09-analytics/AnalyticsPanel";
import { PageHeader, PageBody } from "@/components/PageHeader";

// Reads live DB state (RPCs); render per request rather than at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireAdmin();

  return (
    <PageBody>
      <PageHeader
        title="Analytics"
        subtitle="Cross-team & cross-card spend across all teams."
      />
      <AnalyticsPanel />
    </PageBody>
  );
}
