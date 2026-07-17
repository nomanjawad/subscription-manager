// Thin route — the subscription FORM page. Creates by default; edits an
// existing subscription when ?edit=<id> is present.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getActiveCards } from "@/modules/m01-cards/queries";
import { SubscriptionForm } from "@/modules/m02-subscriptions/SubscriptionForm";
import {
  getSubscriptionOverview,
  getTags,
} from "@/modules/m02-subscriptions/queries";

export const dynamic = "force-dynamic";

export default async function NewSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;

  const [cards, tags, editing] = await Promise.all([
    getActiveCards(),
    getTags(),
    edit ? getSubscriptionOverview(edit) : Promise.resolve(null),
  ]);

  const isEdit = editing !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? `Edit subscription — ${editing.platform}` : "Add subscription"}
        </h1>
        <Button asChild variant="ghost">
          <Link href="/subscriptions">Back to subscriptions</Link>
        </Button>
      </div>

      <SubscriptionForm
        key={editing?.id ?? "create"}
        cards={cards}
        tags={tags}
        subscription={editing ?? undefined}
      />
    </div>
  );
}
