"use client";

// m10-users — "Add user" dialog. Creates a member (non-login) via addMember and
// assigns them to a team lead. No password / auth account — members only ever
// submit subscription requests. Astryx inputs are controlled, so values are
// mirrored into hidden inputs for the FormData the action reads.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { LeadOption } from "@/lib/types";
import { addMember } from "./actions";
import { LeadPicker } from "./LeadPicker";

export function AddUserDialog({ leads }: { leads: LeadOption[] }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const hasLeads = leads.length > 0;

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addMember(formData);
        setOpen(false);
        setFullName("");
        setEmail("");
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Something went wrong. Try again.",
        );
      }
    });
  }

  if (!hasLeads) {
    return (
      <Button
        type="button"
        label="Add user"
        isDisabled
        tooltip="Add a team lead first."
      />
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        label="Add user"
        onClick={() => setOpen(true)}
      />
      <Dialog isOpen={open} onOpenChange={setOpen} purpose="form" width={460}>
        <form action={onSubmit}>
          <input type="hidden" name="full_name" value={fullName} />
          <input type="hidden" name="email" value={email} />
          <Layout
            header={
              <DialogHeader
                title="Add user"
                subtitle="Users can’t sign in — they only submit subscription requests. Assign one to a team lead, whose team then handles their requests."
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
                  <VStack gap={1}>
                    <Text type="label" as="label">
                      Team lead
                    </Text>
                    <LeadPicker leads={leads} name="lead_id" required />
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
                    label={pending ? "Adding…" : "Add user"}
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
