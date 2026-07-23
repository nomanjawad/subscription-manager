// Thin admin route — mounts the m01-cards panel. Admin-only.
import { PageHeader, PageBody } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/supabase/auth";
import { CardsPanel } from "@/modules/m01-cards/CardsPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Cards",
};

export default async function CardsPage() {
  await requireAdmin();

  return (
    <PageBody>
      <PageHeader
        title="Cards"
        subtitle="Company cards synced from Mercury. Assign each to a team so its spend is attributed."
      />
      <CardsPanel />
    </PageBody>
  );
}
