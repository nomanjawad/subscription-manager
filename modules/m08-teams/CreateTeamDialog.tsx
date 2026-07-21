"use client";

// m08-teams — "New team" dialog. Submits to createTeam inside a transition; on
// success it closes and refreshes the teams table.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Switch } from "@astryxdesign/core/Switch";
import { createTeam, type CreateTeamState } from "./actions";

const initialState: CreateTeamState = { ok: false, error: null };

export function CreateTeamDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTeam(initialState, formData);
      if (result.ok) {
        setOpen(false);
        setName("");
        setAutoApprove(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        label="New team"
        onClick={() => setOpen(true)}
      />
      <Dialog isOpen={open} onOpenChange={setOpen} purpose="form" width={460}>
        <form action={onSubmit}>
          <input type="hidden" name="name" value={name} />
          <input
            type="hidden"
            name="auto_approve"
            value={autoApprove ? "on" : "off"}
          />
          <Layout
            header={
              <DialogHeader
                title="New team"
                subtitle="Create a team to group subscriptions, requests and leads."
                onOpenChange={setOpen}
              />
            }
            content={
              <LayoutContent>
                <VStack gap={4}>
                  <TextInput
                    label="Team name"
                    value={name}
                    onChange={setName}
                    isRequired
                    placeholder="e.g. Design"
                  />
                  <Switch
                    label="Auto-approve requests"
                    description="New requests to this team skip manual review."
                    value={autoApprove}
                    onChange={(next) => setAutoApprove(next)}
                    labelSpacing="spread"
                  />
                  {error && (
                    <Text type="supporting" className="text-error">
                      {error}
                    </Text>
                  )}
                </VStack>
              </LayoutContent>
            }
            footer={
              <LayoutFooter>
                <HStack gap={2} hAlign="end">
                  <Button
                    type="button"
                    variant="secondary"
                    label="Cancel"
                    onClick={() => setOpen(false)}
                    isDisabled={pending}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    label={pending ? "Creating…" : "Create team"}
                    isLoading={pending}
                  />
                </HStack>
              </LayoutFooter>
            }
          />
        </form>
      </Dialog>
    </>
  );
}
