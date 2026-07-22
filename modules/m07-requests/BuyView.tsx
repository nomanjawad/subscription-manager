// m07-requests — the "To buy" view (heading + add button + approved queue).
// Shared by the buyer's home (/buyer) and the admin's To-buy page (/admin/buy);
// addHref is the role-prefixed path to the create-subscription form.
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { LinkButton } from "@/components/LinkButton";
import { BuyQueue } from "./BuyQueue";

export function BuyView({ addHref }: { addHref: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Heading level={1}>To buy</Heading>
        <LinkButton href={addHref} variant="primary" label="Add subscription" />
      </div>
      <Text type="supporting">
        Approved requests waiting to be purchased. Marking one purchased creates
        the subscription and records you as the buyer.
      </Text>
      <BuyQueue />
    </div>
  );
}
