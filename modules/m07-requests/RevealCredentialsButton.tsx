"use client";

// m07-requests — admin "View credentials" button. Decrypts on demand via the
// revealRequestCredentials server action (which audits each reveal); the
// plaintext lives only in this dialog's state and is cleared on close.
import { useState, useTransition } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { RequestCredentials } from "@/lib/types";
import { revealRequestCredentials } from "./credentials";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <VStack gap={0.5}>
      <Text type="label">{label}</Text>
      <Text className="whitespace-pre-wrap break-words font-mono" size="sm">
        {value ?? "—"}
      </Text>
    </VStack>
  );
}

export function RevealCredentialsButton({
  requestId,
  platform,
}: {
  requestId: string;
  platform: string;
}) {
  const [open, setOpen] = useState(false);
  const [creds, setCreds] = useState<RequestCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reveal(): void {
    setError(null);
    setOpen(true);
    startTransition(async () => {
      try {
        setCreds(await revealRequestCredentials(requestId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reveal credentials.");
      }
    });
  }

  function onOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) {
      // Drop the plaintext as soon as the dialog closes.
      setCreds(null);
      setError(null);
    }
  }

  return (
    <>
      <Button
        label="View credentials"
        size="sm"
        variant="ghost"
        type="button"
        onClick={reveal}
      />
      <Dialog isOpen={open} onOpenChange={onOpenChange} width={480}>
        <Layout
          header={
            <DialogHeader
              title={`Credentials — ${platform}`}
              subtitle="Decrypted for you just now. This view is logged."
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              {error ? (
                <Banner status="error" title={error} container="card" />
              ) : pending || !creds ? (
                <Text type="supporting">Decrypting…</Text>
              ) : (
                <VStack gap={4}>
                  <Field label="Login (email / username)" value={creds.login} />
                  <Field label="Password" value={creds.password} />
                  <Field label="Notes" value={creds.notes} />
                </VStack>
              )}
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button
                  label="Close"
                  variant="secondary"
                  type="button"
                  onClick={() => onOpenChange(false)}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}
