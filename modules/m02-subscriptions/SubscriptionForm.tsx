"use client";

// m02-subscriptions — create/edit form posting straight to the server actions.
// Astryx inputs are controlled, so each value is mirrored into a hidden input
// for the FormData submit. The card/team dropdowns are the m01/m08 public
// pickers (they render their own hidden inputs).
import Link from "next/link";
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Selector } from "@astryxdesign/core/Selector";
import { DateInput } from "@astryxdesign/core/DateInput";
import type {
  CardRow,
  SubscriptionOverviewRow,
  TeamOption,
} from "@/lib/types";
import { CardPicker } from "@/modules/m01-cards/CardPicker";
import { TeamPicker } from "@/modules/m08-teams/TeamPicker";
import { createSubscription, updateSubscription } from "./actions";

// Astryx DateInput types its value as a YYYY-MM-DD template literal.
type IsoDate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

interface SubscriptionFormProps {
  cards: CardRow[];
  subscription?: SubscriptionOverviewRow;
  teams?: TeamOption[];
  lockedTeamId?: string | null;
  lockedTeamName?: string | null;
}

export function SubscriptionForm({
  cards,
  subscription,
  teams = [],
  lockedTeamId,
  lockedTeamName,
}: SubscriptionFormProps) {
  const isEdit = subscription !== undefined;
  const action = isEdit
    ? updateSubscription.bind(null, subscription.id)
    : createSubscription;

  const [platform, setPlatform] = useState(subscription?.platform ?? "");
  const [product, setProduct] = useState(subscription?.product ?? "");
  const [orderNumber, setOrderNumber] = useState(
    subscription?.order_number ?? "",
  );
  const [amount, setAmount] = useState(
    subscription?.amount != null ? String(subscription.amount) : "",
  );
  const [currency, setCurrency] = useState(subscription?.currency ?? "USD");
  const [billingCycle, setBillingCycle] = useState(
    subscription?.billing_cycle ?? "monthly",
  );
  const [nextRenewalDate, setNextRenewalDate] = useState(
    subscription?.next_renewal_date ?? "",
  );
  const [accountEmail, setAccountEmail] = useState(
    subscription?.account_email ?? "",
  );
  const [tag, setTag] = useState(subscription?.tag ?? "");
  const [notes, setNotes] = useState(subscription?.notes ?? "");

  return (
    <form action={action}>
      <Card padding={5}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <TextInput
              label="Platform"
              isRequired
              value={platform}
              onChange={setPlatform}
              placeholder="e.g. Google Workspace"
            />
            <input type="hidden" name="platform" value={platform} />
          </div>

          <div>
            <TextInput
              label="Product"
              value={product}
              onChange={setProduct}
              placeholder="e.g. Business Standard"
            />
            <input type="hidden" name="product" value={product} />
          </div>

          <div>
            <TextInput
              label="Order number"
              value={orderNumber}
              onChange={setOrderNumber}
            />
            <input type="hidden" name="order_number" value={orderNumber} />
          </div>

          <div className="space-y-1.5">
            <Text type="label" as="label">
              Team
            </Text>
            {lockedTeamId ? (
              <>
                <TextInput
                  label="Team"
                  isLabelHidden
                  value={lockedTeamName ?? lockedTeamId}
                  onChange={() => {}}
                  isDisabled
                />
                <input type="hidden" name="team_id" value={lockedTeamId} />
              </>
            ) : (
              <TeamPicker
                teams={teams}
                name="team_id"
                includeUnassigned
                defaultValue={subscription?.team_id ?? undefined}
              />
            )}
          </div>

          <div>
            <TextInput
              label="Amount"
              isRequired
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
            />
            <input type="hidden" name="amount" value={amount} />
          </div>

          <div>
            <TextInput
              label="Currency"
              value={currency}
              onChange={setCurrency}
            />
            <input type="hidden" name="currency" value={currency} />
          </div>

          <div>
            <Selector
              label="Billing cycle"
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
              value={billingCycle}
              onChange={(v) => setBillingCycle(v as "monthly" | "yearly")}
            />
            <input type="hidden" name="billing_cycle" value={billingCycle} />
          </div>

          <div>
            <DateInput
              label="Next renewal date"
              isRequired
              value={nextRenewalDate ? (nextRenewalDate as IsoDate) : undefined}
              onChange={(v) => setNextRenewalDate(v ?? "")}
            />
            <input
              type="hidden"
              name="next_renewal_date"
              value={nextRenewalDate}
            />
          </div>

          <div className="space-y-1.5">
            <Text type="label" as="label">
              Card
            </Text>
            <CardPicker
              cards={cards}
              name="card_id"
              defaultValue={subscription?.card_id}
            />
          </div>

          <div>
            <TextInput
              label="Account email"
              type="email"
              value={accountEmail}
              onChange={setAccountEmail}
              placeholder="billing@company.com"
            />
            <input type="hidden" name="account_email" value={accountEmail} />
          </div>

          <div>
            <TextInput
              label="Tag"
              value={tag}
              onChange={setTag}
              placeholder="e.g. design"
              description="Single tag, lowercased."
            />
            <input type="hidden" name="tag" value={tag} />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <TextArea
              label="Notes"
              rows={2}
              value={notes}
              onChange={setNotes}
            />
            <input type="hidden" name="notes" value={notes} />
          </div>
        </div>

        <HStack gap={2} paddingBlock={0} className="mt-5">
          <Button
            type="submit"
            variant="primary"
            label={isEdit ? "Save changes" : "Add subscription"}
          />
          <Button as={Link} href="/subscriptions" variant="ghost" label="Cancel" />
        </HStack>
      </Card>
    </form>
  );
}
