// Thin admin route — mounts the m09-analytics module.
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/auth";
import AnalyticsPanel from "@/modules/m09-analytics/AnalyticsPanel";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

// Reads live DB state (RPCs); render per request rather than at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <VStack gap={1}>
        <Heading level={1}>Analytics</Heading>
        <Text type="supporting">
          cross-team &amp; cross-card spend · all teams
        </Text>
      </VStack>
      <AnalyticsPanel />
    </div>
  );
}
