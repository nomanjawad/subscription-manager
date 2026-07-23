// Thin admin route — mounts the m11-buyers panel. Admin-only.
import { PageHeader, PageBody } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/supabase/auth";
import { BuyersPanel } from "@/modules/m11-buyers/BuyersPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Buyers",
};

export default async function BuyersPage() {
  await requireAdmin();

  return (
    <PageBody>
      <PageHeader
        title="Buyers"
        subtitle="Central purchasers who work the approved queue and record what was bought."
      />
      <BuyersPanel />
    </PageBody>
  );
}
