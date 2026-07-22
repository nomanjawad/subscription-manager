"use client";

// m15-settings — admin Mercury (bank) API config. Edits the bank_settings
// singleton and can test the connection. The token shows as blank when one is
// stored; leaving it blank on save keeps the existing token.
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
import { testBankConnection, updateBankSettings } from "./actions";
import type { BankSettingsView } from "./queries";

export function BankSettingsCard({ settings }: { settings: BankSettingsView }) {
  const router = useRouter();

  const [apiUrl, setApiUrl] = useState(settings.api_url);
  const [apiToken, setApiToken] = useState("");

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
        await updateBankSettings({ api_url: apiUrl, api_token: apiToken });
        setApiToken("");
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
        const r = await testBankConnection();
        setTestMsg(
          `Connected — Mercury returned ${r.accounts} account${r.accounts === 1 ? "" : "s"}.`,
        );
      } catch (e) {
        setTestErr(e instanceof Error ? e.message : "Connection failed.");
      }
    });
  }

  return (
    <Card padding={0}>
      <VStack gap={1} className="px-5 py-4">
        <Heading level={3}>Bank API (Mercury)</Heading>
        <Text type="supporting">
          Credentials used to sync cards and transactions. Use the sandbox URL
          while testing and the production URL for go-live. Leave the token
          blank to keep the current one.
        </Text>
      </VStack>
      <Divider />

      <VStack gap={4} className="px-5 py-4">
        <TextInput
          label="API URL"
          value={apiUrl}
          onChange={setApiUrl}
          placeholder="https://api.mercury.com/api/v1"
        />
        <TextInput
          label="API token"
          type="password"
          value={apiToken}
          onChange={setApiToken}
          placeholder={settings.hasToken ? "•••••••• (unchanged)" : "secret-token:…"}
        />

        {saveErr && <Banner status="error" title={saveErr} container="card" />}
        {saveMsg && <Banner status="success" title={saveMsg} container="card" />}

        <HStack gap={2}>
          <Button
            type="button"
            variant="primary"
            label={saving ? "Saving…" : "Save bank settings"}
            onClick={onSave}
            isLoading={saving}
          />
          <Button
            type="button"
            variant="secondary"
            label={testing ? "Testing…" : "Test connection"}
            onClick={onTest}
            isLoading={testing}
          />
        </HStack>

        {testErr && <Banner status="error" title={testErr} container="card" />}
        {testMsg && <Banner status="success" title={testMsg} container="card" />}
      </VStack>
    </Card>
  );
}
