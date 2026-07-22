// Thin admin route — mounts the m10-users panel. Admin-only.
import { Heading } from "@astryxdesign/core/Heading";
import { requireAdmin } from "@/lib/supabase/auth";
import { UsersPanel } from "@/modules/m10-users/UsersPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Users",
};

export default async function UsersPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <Heading level={1}>Users</Heading>
      <UsersPanel />
    </div>
  );
}
