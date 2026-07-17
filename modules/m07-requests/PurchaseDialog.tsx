"use client";

// m07-requests — "Mark purchased" dialog for an approved request. The form
// posts straight to purchaseRequest, which creates the real subscription and
// links it back to the request. Prefills come from the request row.
import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { CardRow, SubscriptionRequestRow } from "@/lib/types";
import { CardPicker } from "@/modules/m01-cards/CardPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { purchaseRequest } from "./actions";

interface PurchaseDialogProps {
  request: SubscriptionRequestRow;
  cards: CardRow[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Create subscription"}
    </Button>
  );
}

export function PurchaseDialog({ request, cards }: PurchaseDialogProps) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const action = purchaseRequest.bind(null, request.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          Mark purchased
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Mark purchased — {request.platform}
            {request.product ? ` (${request.product})` : ""}
          </DialogTitle>
          <DialogDescription>
            Creates the real subscription and links it to this request.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`amount-${request.id}`}>Amount *</Label>
              <Input
                id={`amount-${request.id}`}
                name="amount"
                type="number"
                required
                min="0.01"
                step="0.01"
                defaultValue={request.amount_estimate ?? ""}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`currency-${request.id}`}>Currency</Label>
              <Input
                id={`currency-${request.id}`}
                name="currency"
                maxLength={3}
                defaultValue="USD"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`billing_cycle-${request.id}`}>
                Billing cycle
              </Label>
              <Select
                name="billing_cycle"
                defaultValue={request.billing_cycle}
              >
                <SelectTrigger
                  id={`billing_cycle-${request.id}`}
                  className="w-full"
                >
                  <SelectValue placeholder="Billing cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`next_renewal_date-${request.id}`}>
                Next renewal date *
              </Label>
              <Input
                id={`next_renewal_date-${request.id}`}
                name="next_renewal_date"
                type="date"
                required
                defaultValue={today}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Card</Label>
              <CardPicker cards={cards} name="card_id" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`account_email-${request.id}`}>
                Account email
              </Label>
              <Input
                id={`account_email-${request.id}`}
                name="account_email"
                type="email"
                maxLength={200}
                placeholder="billing@company.com"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`tag-${request.id}`}>Tag</Label>
              <Input
                id={`tag-${request.id}`}
                name="tag"
                maxLength={200}
                defaultValue={request.tag ?? ""}
                placeholder="e.g. design-team"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`notes-${request.id}`}>Notes</Label>
              <Textarea
                id={`notes-${request.id}`}
                name="notes"
                rows={2}
                maxLength={2000}
                defaultValue={`Requested by ${request.requester_name}`}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
