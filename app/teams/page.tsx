// Thin admin route — mounts the m08-teams panel. Admin-only.
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
      <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
      <TeamsPanel />
    </div>
  );
}
