// Thin admin route — mounts the m12-admins panel. Admin-only.
import { PageHeader, PageBody } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/supabase/auth";
import { AdminsPanel } from "@/modules/m12-admins/AdminsPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admins",
};

export default async function AdminsPage() {
  const session = await requireAdmin();

  return (
    <PageBody>
      <PageHeader
        title="Admins"
        subtitle="Who can sign in with full access. Add or remove admins here."
      />
      <AdminsPanel currentUserId={session.id} />
    </PageBody>
  );
}
