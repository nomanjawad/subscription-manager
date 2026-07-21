"use client";

// m08-teams — "Add team lead" dialog. Creates a GoTrue account + profile via
// addTeamLead. The password is temporary; the lead can change it after their
// first sign-in. Astryx inputs are controlled, so values are mirrored into
// hidden inputs for the FormData the action reads.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { TeamOption } from "@/lib/types";
import { addTeamLead } from "./actions";
import { TeamPicker } from "./TeamPicker";

export function AddTeamLeadDialog({ teams }: { teams: TeamOption[] }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const hasTeams = teams.length > 0;

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addTeamLead(formData);
        setOpen(false);
        setFullName("");
        setEmail("");
        setPassword("");
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Something went wrong. Try again.",
        );
      }
    });
  }

  if (!hasTeams) {
    return (
      <Button
        type="button"
        label="Add team lead"
        isDisabled
        tooltip="Create a team first."
      />
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        label="Add team lead"
        onClick={() => setOpen(true)}
      />
      <Dialog isOpen={open} onOpenChange={setOpen} purpose="form" width={460}>
        <form action={onSubmit}>
          <input type="hidden" name="full_name" value={fullName} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="password" value={password} />
          <Layout
            header={
              <DialogHeader
                title="Add team lead"
                subtitle="Creates a login for a team lead. The password is temporary — they can change it after signing in."
                onOpenChange={setOpen}
              />
            }
            content={
              <LayoutContent>
                <VStack gap={4}>
                  <TextInput
                    label="Full name"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Jane Doe"
                  />
                  <TextInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    isRequired
                    placeholder="jane@company.com"
                  />
                  <TextInput
                    label="Temporary password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    isRequired
                    description="At least 8 characters."
                  />
                  <VStack gap={1}>
                    <Text type="label" as="label">
                      Team
                    </Text>
                    <TeamPicker teams={teams} name="team_id" required />
                  </VStack>
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
                    label={pending ? "Adding…" : "Add team lead"}
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
