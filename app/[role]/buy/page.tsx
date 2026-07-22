// The To-buy queue — approved requests awaiting purchase (company-wide).
// Admins and buyers only (buyers reach the same view from their home).
import { requireBuyerOrAdmin } from "@/lib/supabase/auth";
import { rolePath } from "@/lib/roles";
import { BuyView } from "@/modules/m07-requests/BuyView";

export const dynamic = "force-dynamic";
export const metadata = { title: "To buy" };

export default async function BuyPage() {
  const session = await requireBuyerOrAdmin();
  return <BuyView addHref={rolePath(session.role, "subscriptions/new")} />;
}
