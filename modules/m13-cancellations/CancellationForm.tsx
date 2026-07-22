"use client";

// m13-cancellations — public cancellation form (/cancellation-request). Mirrors
// RequestForm: controlled Astryx inputs mirrored into hidden inputs, posts to
// submitCancellation via useActionState, swaps to a thank-you state on success.
import { useActionState, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import type { TeamOption } from "@/lib/types";
import { TeamPicker } from "@/modules/m08-teams/TeamPicker";
import { submitCancellation, type CancelState } from "./actions";

const initialState: CancelState = { ok: false, error: null };

export function CancellationForm({ teams }: { teams: TeamOption[] }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <CancellationFormInner
      key={formKey}
      teams={teams}
      onReset={() => setFormKey((k) => k + 1)}
    />
  );
}

function CancellationFormInner({
  teams,
  onReset,
}: {
  teams: TeamOption[];
  onReset: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    submitCancellation,
    initialState,
  );

  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [platform, setPlatform] = useState("");
  const [product, setProduct] = useState("");
  const [reason, setReason] = useState("");

  if (state.ok) {
    return (
      <Card padding={6}>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={3}>Cancellation requested</Heading>
            <Text type="supporting">
              Thanks! Your subscription is now pending cancellation — we&apos;ll
              email you once it&apos;s done.
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
        <Heading level={3}>Cancel a subscription</Heading>
        <Text type="supporting">
          Tell us what to cancel — fields marked * are required.
        </Text>
      </VStack>

      <form action={formAction}>
        <input type="hidden" name="requester_name" value={requesterName} />
        <input type="hidden" name="requester_email" value={requesterEmail} />
        <input type="hidden" name="platform" value={platform} />
        <input type="hidden" name="product" value={product} />
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
                    Team / category
                  </Text>
                  <TeamPicker
                    teams={teams}
                    name="team_id"
                    placeholder="Choose a team"
                  />
                  <Text type="supporting">
                    If your email is registered with us, we&apos;ll route this to
                    your team automatically — otherwise pick the team it&apos;s
                    for.
                  </Text>
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

            <div className="sm:col-span-2">
              <TextArea
                label="Why are you cancelling?"
                value={reason}
                onChange={setReason}
                rows={3}
                maxLength={2000}
                placeholder="Optional — a sentence helps."
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
              label={pending ? "Submitting…" : "Request cancellation"}
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
