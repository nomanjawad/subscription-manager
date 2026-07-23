// Thin admin route — mounts the m10-users panel. Admin-only.
import { PageHeader, PageBody } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/supabase/auth";
import { UsersPanel } from "@/modules/m10-users/UsersPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Users",
};

export default async function UsersPage() {
  await requireAdmin();

  return (
    <PageBody>
      <PageHeader
        title="Users"
        subtitle="People who submit subscription requests, each assigned to a team lead."
      />
      <UsersPanel />
    </PageBody>
  );
}
