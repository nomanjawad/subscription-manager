// Thin admin route — mounts the m11-buyers panel. Admin-only.
import { Heading } from "@astryxdesign/core/Heading";
import { requireAdmin } from "@/lib/supabase/auth";
import { BuyersPanel } from "@/modules/m11-buyers/BuyersPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Buyers",
};

export default async function BuyersPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <Heading level={1}>Buyers</Heading>
      <BuyersPanel />
    </div>
  );
}
