"use client";

// m02-subscriptions — create/edit form posting straight to the server actions.
// The card dropdown is m01-cards' public CardPicker component.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CardRow, SubscriptionOverviewRow } from "@/lib/types";
import { CardPicker } from "@/modules/m01-cards/CardPicker";
import { createSubscription, updateSubscription } from "./actions";

interface SubscriptionFormProps {
  cards: CardRow[];
  /** Existing tags, offered as datalist suggestions for the tag field. */
  tags?: string[];
  subscription?: SubscriptionOverviewRow;
}

export function SubscriptionForm({
  cards,
  tags = [],
  subscription,
}: SubscriptionFormProps) {
  const isEdit = subscription !== undefined;
  const action = isEdit
    ? updateSubscription.bind(null, subscription.id)
    : createSubscription;

  return (
    <form action={action}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="platform">
              Platform <span className="text-destructive">*</span>
            </Label>
            <Input
              id="platform"
              name="platform"
              type="text"
              required
              defaultValue={subscription?.platform ?? ""}
              placeholder="e.g. Google Workspace"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product">Product</Label>
            <Input
              id="product"
              name="product"
              type="text"
              defaultValue={subscription?.product ?? ""}
              placeholder="e.g. Business Standard"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="order_number">Order number</Label>
            <Input
              id="order_number"
              name="order_number"
              type="text"
              defaultValue={subscription?.order_number ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              required
              min="0.01"
              step="0.01"
              defaultValue={subscription?.amount ?? ""}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              name="currency"
              type="text"
              maxLength={3}
              defaultValue={subscription?.currency ?? "USD"}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="billing_cycle">Billing cycle</Label>
            <Select
              name="billing_cycle"
              defaultValue={subscription?.billing_cycle ?? "monthly"}
            >
              <SelectTrigger id="billing_cycle" className="w-full">
                <SelectValue placeholder="Billing cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="next_renewal_date">
              Next renewal date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="next_renewal_date"
              name="next_renewal_date"
              type="date"
              required
              defaultValue={subscription?.next_renewal_date ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card_id">Card</Label>
            <CardPicker
              cards={cards}
              name="card_id"
              defaultValue={subscription?.card_id}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account_email">Account email</Label>
            <Input
              id="account_email"
              name="account_email"
              type="email"
              defaultValue={subscription?.account_email ?? ""}
              placeholder="billing@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tag">Tag</Label>
            <Input
              id="tag"
              name="tag"
              type="text"
              maxLength={40}
              defaultValue={subscription?.tag ?? ""}
              placeholder="e.g. design"
              list="subscription-tag-options"
            />
            <datalist id="subscription-tag-options">
              {tags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Single tag, lowercased — e.g. &quot;design&quot;,
              &quot;engineering&quot;.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={subscription?.notes ?? ""}
            />
          </div>
        </CardContent>

        <CardFooter className="gap-2">
          <Button type="submit">
            {isEdit ? "Save changes" : "Add subscription"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/subscriptions">Cancel</Link>
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
