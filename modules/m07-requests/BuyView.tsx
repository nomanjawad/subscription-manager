// m07-requests — the "To buy" view (heading + add button + approved queue).
// Shared by the buyer's home (/buyer) and the admin's To-buy page (/admin/buy);
// addHref is the role-prefixed path to the create-subscription form.
import { LinkButton } from "@/components/LinkButton";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { BuyQueue } from "./BuyQueue";

export function BuyView({ addHref }: { addHref: string }) {
  return (
    <PageBody>
      <PageHeader
        title="To buy"
        subtitle="Approved requests waiting to be purchased. Marking one purchased creates the subscription and records you as the buyer."
        actions={
          <LinkButton href={addHref} variant="primary" label="Add subscription" />
        }
      />
      <BuyQueue />
    </PageBody>
  );
}
