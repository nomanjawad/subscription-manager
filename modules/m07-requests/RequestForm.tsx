"use client";

// m07-requests — public request form (/subscription-request). Posts to submitRequest via
// useActionState; on success it swaps to a thank-you state with a
// "Submit another" button that remounts the form (key bump resets everything).
//
// Astryx inputs are controlled (value/onChange, no `name`), so every value is
// mirrored into a hidden input for the server-action FormData submit.
import { useActionState, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import type { TeamOption } from "@/lib/types";
import { TeamPicker } from "@/modules/m08-teams/TeamPicker";
import { submitRequest, type SubmitState } from "./actions";

const initialState: SubmitState = { ok: false, error: null };

export function RequestForm({ teams }: { teams: TeamOption[] }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <RequestFormInner
      key={formKey}
      teams={teams}
      onReset={() => setFormKey((k) => k + 1)}
    />
  );
}

function RequestFormInner({
  teams,
  onReset,
}: {
  teams: TeamOption[];
  onReset: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    submitRequest,
    initialState,
  );

  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [platform, setPlatform] = useState("");
  const [product, setProduct] = useState("");
  const [amountEstimate, setAmountEstimate] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [reason, setReason] = useState("");

  if (state.ok) {
    return (
      <Card padding={6}>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={3}>Request submitted</Heading>
            <Text type="supporting">
              Thanks! The admin team will review your request and get back to
              you by email.
            </Text>
          </VStack>
          <HStack>
            <Button
              label="Submit another"
              type="button"
              variant="secondary"
              onClick={onReset}
            />
          </HStack>
        </VStack>
      </Card>
    );
  }

  return (
    <Card padding={6}>
      <VStack gap={1}>
        <Heading level={3}>New request</Heading>
        <Text type="supporting">
          Tell us what you need — fields marked * are required.
        </Text>
      </VStack>

      <form action={formAction}>
        <input type="hidden" name="requester_name" value={requesterName} />
        <input type="hidden" name="requester_email" value={requesterEmail} />
        <input type="hidden" name="platform" value={platform} />
        <input type="hidden" name="product" value={product} />
        <input
          type="hidden"
          name="amount_estimate"
          value={amountEstimate === null ? "" : String(amountEstimate)}
        />
        <input type="hidden" name="billing_cycle" value={billingCycle} />
        <input type="hidden" name="reason" value={reason} />

        <VStack gap={4} paddingBlock={4}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Your name"
              value={requesterName}
              onChange={setRequesterName}
              isRequired
              placeholder="Jane Doe"
            />
            <TextInput
              label="Your email"
              type="email"
              value={requesterEmail}
              onChange={setRequesterEmail}
              isRequired
              placeholder="jane@company.com"
            />

            {teams.length > 0 ? (
              <div className="sm:col-span-2">
                <VStack gap={1}>
                  <Text type="label" as="label">
                    Team / category *
                  </Text>
                  <TeamPicker
                    teams={teams}
                    name="team_id"
                    required
                    placeholder="Choose a team"
                  />
                </VStack>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <Text type="supporting">
                  No teams have been set up yet — your request will be submitted
                  unassigned.
                </Text>
              </div>
            )}

            <TextInput
              label="Platform"
              value={platform}
              onChange={setPlatform}
              isRequired
              placeholder="e.g. Figma"
            />
            <TextInput
              label="Product / plan"
              value={product}
              onChange={setProduct}
              placeholder="e.g. Professional plan"
            />
            <NumberInput
              label="Estimated cost"
              value={amountEstimate}
              onChange={setAmountEstimate}
              min={0.01}
              step={0.01}
              hasClear
              placeholder="0.00"
            />
            <Selector
              label="Billing cycle"
              value={billingCycle}
              onChange={setBillingCycle}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />

            <div className="sm:col-span-2">
              <TextArea
                label="Why do you need it?"
                value={reason}
                onChange={setReason}
                rows={3}
                maxLength={2000}
                placeholder="A sentence or two helps us review faster."
              />
            </div>

            {state.error ? (
              <div className="sm:col-span-2">
                <Banner status="error" title={state.error} container="card" />
              </div>
            ) : null}
          </div>

          <HStack>
            <Button
              label={pending ? "Submitting…" : "Submit request"}
              type="submit"
              variant="primary"
              isLoading={pending}
            />
          </HStack>
        </VStack>
      </form>
    </Card>
  );
}
