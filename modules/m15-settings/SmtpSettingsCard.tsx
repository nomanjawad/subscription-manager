"use client";

// m15-settings — admin SMTP config form (Users page). Edits the smtp_settings
// singleton and can fire a test email. Password shows as blank when one is
// already stored; leaving it blank on save keeps the existing password.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { sendTestEmail, updateSmtpSettings } from "./actions";
import type { SmtpSettingsView } from "./queries";

export function SmtpSettingsCard({ settings }: { settings: SmtpSettingsView }) {
  const router = useRouter();

  const [host, setHost] = useState(settings.host);
  const [port, setPort] = useState(settings.port ? String(settings.port) : "465");
  const [username, setUsername] = useState(settings.username);
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState(settings.from_email);
  const [testTo, setTestTo] = useState("");

  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();

  function onSave() {
    setSaveMsg(null);
    setSaveErr(null);
    startSave(async () => {
      try {
        await updateSmtpSettings({
          host,
          port,
          username,
          password,
          from_email: fromEmail,
        });
        setPassword("");
        setSaveMsg("Saved.");
        router.refresh();
      } catch (e) {
        setSaveErr(e instanceof Error ? e.message : "Couldn't save settings.");
      }
    });
  }

  function onTest() {
    setTestMsg(null);
    setTestErr(null);
    startTest(async () => {
      try {
        await sendTestEmail(testTo);
        setTestMsg(`Test email sent to ${testTo}.`);
      } catch (e) {
        setTestErr(e instanceof Error ? e.message : "Couldn't send test email.");
      }
    });
  }

  return (
    <Card padding={0}>
      <VStack gap={1} className="px-5 py-4">
        <Heading level={3}>Email / SMTP</Heading>
        <Text type="supporting">
          Outbound mail server for all notifications and the monthly report.
          Works with any provider (e.g. SkyTech BPO webmail, SES, Google
          Workspace). Leave the password blank to keep the current one.
        </Text>
      </VStack>
      <Divider />

      <VStack gap={4} className="px-5 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="Host"
            value={host}
            onChange={setHost}
            placeholder="mail.skytechbpo.com"
          />
          <TextInput
            label="Port"
            value={port}
            onChange={setPort}
            placeholder="465 (SSL) or 587 (STARTTLS)"
          />
          <TextInput
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="notifications@skytechbpo.com"
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={settings.hasPassword ? "•••••••• (unchanged)" : "mailbox password"}
          />
          <div className="sm:col-span-2">
            <TextInput
              label="From address"
              value={fromEmail}
              onChange={setFromEmail}
              placeholder="Subscriptions <notifications@skytechbpo.com>"
            />
          </div>
        </div>

        {saveErr && <Banner status="error" title={saveErr} container="card" />}
        {saveMsg && <Banner status="success" title={saveMsg} container="card" />}

        <HStack>
          <Button
            type="button"
            variant="primary"
            label={saving ? "Saving…" : "Save SMTP settings"}
            onClick={onSave}
            isLoading={saving}
          />
        </HStack>
      </VStack>
      <Divider />

      <VStack gap={3} className="px-5 py-4">
        <Text type="label" as="p">
          Send a test email
        </Text>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <TextInput
            label="Recipient"
            type="email"
            value={testTo}
            onChange={setTestTo}
            placeholder="you@skytechbpo.com"
          />
          <Button
            type="button"
            variant="secondary"
            label={testing ? "Sending…" : "Send test"}
            onClick={onTest}
            isLoading={testing}
            isDisabled={testTo.trim() === ""}
          />
        </div>
        {testErr && <Banner status="error" title={testErr} container="card" />}
        {testMsg && <Banner status="success" title={testMsg} container="card" />}
      </VStack>
    </Card>
  );
}
