// Thin admin route — mounts the m08-teams panel. Admin-only.
import { PageHeader, PageBody } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/supabase/auth";
import { TeamsPanel } from "@/modules/m08-teams/TeamsPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Teams",
};

export default async function TeamsPage() {
  await requireAdmin();

  return (
    <PageBody>
      <PageHeader
        title="Teams"
        subtitle="Categories that group subscriptions and requests. Assign team leads and toggle auto-approval."
      />
      <TeamsPanel />
    </PageBody>
  );
}
