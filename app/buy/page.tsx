// The buyer's to-buy queue — approved requests awaiting purchase (company-wide).
// Admins and buyers only; team leads are bounced by middleware + requireBuyerOrAdmin.
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { LinkButton } from "@/components/LinkButton";
import { requireBuyerOrAdmin } from "@/lib/supabase/auth";
import { BuyQueue } from "@/modules/m07-requests/BuyQueue";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "To buy",
};

export default async function BuyPage() {
  await requireBuyerOrAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Heading level={1}>To buy</Heading>
        <LinkButton
          href="/subscriptions/new"
          variant="primary"
          label="Add subscription"
        />
      </div>
      <Text type="supporting">
        Approved requests waiting to be purchased. Marking one purchased creates
        the subscription and records you as the buyer.
      </Text>
      <BuyQueue />
    </div>
  );
}
