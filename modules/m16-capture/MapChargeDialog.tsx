"use client";

// m16-capture — map one captured charge to a real subscription. Prefilled from
// the bank charge; a team is required (assigning it is what promotes the charge
// into the subscriptions list). Calls the typed mapChargeToSubscription action.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack } from "@astryxdesign/core/HStack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { DateInput } from "@astryxdesign/core/DateInput";
import type { TeamOption } from "@/lib/types";
import { mapChargeToSubscription } from "./actions";
import type { CapturedCharge } from "./queries";

type IsoDate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

/** Next renewal = one month after the charge posted (or today if unknown). */
function nextRenewalFrom(postedAt: string | null): string {
  const base = postedAt ? new Date(postedAt) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
  const next = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate()),
  );
  return next.toISOString().slice(0, 10);
}

export function MapChargeDialog({
  charge,
  teams,
}: {
  charge: CapturedCharge;
  teams: TeamOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [platform, setPlatform] = useState(
    charge.counterparty ?? charge.description ?? "",
  );
  const [amount, setAmount] = useState<number | null>(charge.amount);
  const [currency, setCurrency] = useState("USD");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [renewalDate, setRenewalDate] = useState<string>(
    nextRenewalFrom(charge.postedAt),
  );
  const [teamId, setTeamId] = useState("");
  const [tag, setTag] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSave() {
    setError(null);
    start(async () => {
      try {
        await mapChargeToSubscription({
          sourceTransactionId: charge.transactionId,
          platform,
          amount: amount ?? 0,
          currency,
          billingCycle,
          nextRenewalDate: renewalDate,
          teamId,
          tag: tag || null,
        });
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't map this charge.");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="primary"
        label="Map to subscription"
        onClick={() => setOpen(true)}
      />
      <Dialog isOpen={open} onOpenChange={setOpen} purpose="form" width={560}>
        <Layout
          header={
            <DialogHeader
              title="Map charge to subscription"
              subtitle="Assign a team to add this to the subscriptions list."
              onOpenChange={setOpen}
            />
          }
          content={
            <LayoutContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextInput
                    label="Platform"
                    value={platform}
                    onChange={setPlatform}
                    isRequired
                    placeholder="e.g. Figma"
                  />
                </div>
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
                <div className="sm:col-span-2">
                  <Selector
                    label="Team"
                    value={teamId}
                    onChange={setTeamId}
                    placeholder="Choose a team"
                    options={teams.map((t) => ({ value: t.id, label: t.name }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <TextInput
                    label="Tag (optional)"
                    value={tag}
                    onChange={setTag}
                    placeholder="e.g. design-team"
                  />
                </div>
                {error && (
                  <div className="sm:col-span-2">
                    <Banner status="error" title={error} container="card" />
                  </div>
                )}
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
                  isDisabled={pending}
                />
                <Button
                  label={pending ? "Mapping…" : "Map to subscription"}
                  type="button"
                  variant="primary"
                  onClick={onSave}
                  isLoading={pending}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}
