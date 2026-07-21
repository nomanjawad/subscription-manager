// Thin admin route — mounts the m01-cards panel. Admin-only.
import { Heading } from "@astryxdesign/core/Heading";
import { requireAdmin } from "@/lib/supabase/auth";
import { CardsPanel } from "@/modules/m01-cards/CardsPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Cards",
};

export default async function CardsPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <Heading level={1}>Cards</Heading>
      <CardsPanel />
    </div>
  );
}
