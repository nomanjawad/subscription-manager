// Thin admin route — mounts the m08-teams panel. Admin-only.
import { Heading } from "@astryxdesign/core/Heading";
import { requireAdmin } from "@/lib/supabase/auth";
import { TeamsPanel } from "@/modules/m08-teams/TeamsPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Teams",
};

export default async function TeamsPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <Heading level={1}>Teams</Heading>
      <TeamsPanel />
    </div>
  );
}
