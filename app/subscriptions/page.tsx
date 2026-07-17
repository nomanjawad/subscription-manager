// Thin route — mounts m01-cards + m02-subscriptions components.
import { getActiveCards } from "@/modules/m01-cards/queries";
import { SyncCardsButton } from "@/modules/m01-cards/SyncCardsButton";
import { SubscriptionForm } from "@/modules/m02-subscriptions/SubscriptionForm";
import { SubscriptionList } from "@/modules/m02-subscriptions/SubscriptionList";
import { getSubscriptionOverview } from "@/modules/m02-subscriptions/queries";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;

  const [cards, editing] = await Promise.all([
    getActiveCards(),
    edit ? getSubscriptionOverview(edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <SyncCardsButton />
      </div>

      <SubscriptionForm
        key={editing?.id ?? "create"}
        cards={cards}
        subscription={editing ?? undefined}
      />

      <SubscriptionList />
    </div>
  );
}
