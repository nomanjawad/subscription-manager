"use client";

// m12-admins — "Add admin" dialog. Creates a GoTrue account + profile via
// addAdmin. No password: adding the email is the allow-list entry; the admin
// signs in with Google and sets up an authenticator app.
// Astryx inputs are controlled, so values are mirrored into hidden inputs for
// the FormData the action reads.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { addAdmin } from "./actions";

export function AddAdminDialog() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addAdmin(formData);
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

  return (
    <>
      <Button
        type="button"
        variant="primary"
        label="Add admin"
        onClick={() => setOpen(true)}
      />
      <Dialog isOpen={open} onOpenChange={setOpen} purpose="form" width={460}>
        <form action={onSubmit}>
          <input type="hidden" name="full_name" value={fullName} />
          <input type="hidden" name="email" value={email} />
          <Layout
            header={
              <DialogHeader
                title="Add admin"
                subtitle="Creates an admin login with full access to everything. They sign in with this Google account and set up an authenticator app."
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
                    description="Their Google account email — the only address they can sign in with."
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
                    label={pending ? "Adding…" : "Add admin"}
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
