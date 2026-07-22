"use client";

// m07-requests — "Mark purchased" dialog for an approved request. The form
// posts straight to purchaseRequest, which creates the real subscription and
// links it back to the request. Prefills come from the request row.
//
// Astryx inputs are controlled, so each value is mirrored into a hidden input
// for the server-action FormData submit. CardPicker (owned by m01) posts its
// own `card_id` field and is kept as-is.
import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { CardRow, SubscriptionRequestRow } from "@/lib/types";
import { CardPicker } from "@/modules/m01-cards/CardPicker";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Button } from "@astryxdesign/core/Button";
import { purchaseRequest } from "./actions";

// Astryx DateInput types its value as a YYYY-MM-DD template literal.
type IsoDate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

interface PurchaseDialogProps {
  request: SubscriptionRequestRow;
  cards: CardRow[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      label={pending ? "Saving…" : "Create subscription"}
      type="submit"
      variant="primary"
      isLoading={pending}
    />
  );
}

export function PurchaseDialog({ request, cards }: PurchaseDialogProps) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const action = purchaseRequest.bind(null, request.id);

  const [amount, setAmount] = useState<number | null>(
    request.amount_estimate === null ? null : Number(request.amount_estimate),
  );
  const [currency, setCurrency] = useState("USD");
  const [billingCycle, setBillingCycle] = useState(request.billing_cycle);
  const [renewalDate, setRenewalDate] = useState<string>(today);
  const [accountEmail, setAccountEmail] = useState("");
  const [tag, setTag] = useState(request.tag ?? "");
  const [notes, setNotes] = useState(`Requested by ${request.requester_name}`);

  return (
    <>
      <Button
        label="Mark purchased"
        size="sm"
        variant="primary"
        type="button"
        onClick={() => setOpen(true)}
      />
      <Dialog isOpen={open} onOpenChange={setOpen} purpose="form" width={560}>
        <form action={action}>
          <input
            type="hidden"
            name="amount"
            value={amount === null ? "" : String(amount)}
          />
          <input type="hidden" name="currency" value={currency} />
          <input type="hidden" name="billing_cycle" value={billingCycle} />
          <input type="hidden" name="next_renewal_date" value={renewalDate} />
          <input type="hidden" name="account_email" value={accountEmail} />
          <input type="hidden" name="tag" value={tag} />
          <input type="hidden" name="notes" value={notes} />

          <Layout
            header={
              <DialogHeader
                title={`Mark purchased — ${request.platform}${
                  request.product ? ` (${request.product})` : ""
                }`}
                subtitle="Creates the real subscription and links it to this request."
                onOpenChange={setOpen}
              />
            }
            content={
              <LayoutContent>
                {request.credentials && (
                  <div className="mb-4 rounded-lg border border-default p-3">
                    <Text type="label" as="p">
                      Login details from the requester
                    </Text>
                    <Text
                      type="supporting"
                      className="mt-1 block whitespace-pre-wrap break-words"
                    >
                      {request.credentials}
                    </Text>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <NumberInput
                    label="Amount"
                    value={amount}
                    onChange={setAmount}
                    isRequired
                    min={0.01}
                    step={0.01}
                    placeholder="0.00"
                  />
                  <TextInput
                    label="Currency"
                    value={currency}
                    onChange={setCurrency}
                  />
                  <Selector
                    label="Billing cycle"
                    value={billingCycle}
                    onChange={(v) => setBillingCycle(v as "monthly" | "yearly")}
                    options={[
                      { value: "monthly", label: "Monthly" },
                      { value: "yearly", label: "Yearly" },
                    ]}
                  />
                  <DateInput
                    label="Next renewal date"
                    value={renewalDate ? (renewalDate as IsoDate) : undefined}
                    onChange={(v) => setRenewalDate(v ?? "")}
                    isRequired
                  />
                  <div>
                    <VStack gap={1}>
                      <Text type="label" as="label">
                        Card
                      </Text>
                      <CardPicker cards={cards} name="card_id" />
                    </VStack>
                  </div>
                  <TextInput
                    label="Account email"
                    type="email"
                    value={accountEmail}
                    onChange={setAccountEmail}
                    placeholder="billing@company.com"
                  />
                  <div className="sm:col-span-2">
                    <TextInput
                      label="Tag"
                      value={tag}
                      onChange={setTag}
                      placeholder="e.g. design-team"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextArea
                      label="Notes"
                      value={notes}
                      onChange={setNotes}
                      rows={2}
                      maxLength={2000}
                    />
                  </div>
                </div>
              </LayoutContent>
            }
            footer={
              <LayoutFooter>
                <HStack gap={2} hAlign="end">
                  <Button
                    label="Cancel"
                    type="button"
                    variant="secondary"
                    onClick={() => setOpen(false)}
                  />
                  <SubmitButton />
                </HStack>
              </LayoutFooter>
            }
          />
        </form>
      </Dialog>
    </>
  );
}
