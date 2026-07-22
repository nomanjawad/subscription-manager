"use client";

// m14-reports — admin "Send now" control for the monthly spend report. Fires
// the same runner the cron uses and reports how many recipients it reached.
import { useState, useTransition } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { sendMonthlyReportNow } from "./actions";

export function MonthlyReportButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSend() {
    setMsg(null);
    setErr(null);
    start(async () => {
      try {
        const r = await sendMonthlyReportNow();
        setMsg(
          `Sent to ${r.adminRecipients} admin${r.adminRecipients === 1 ? "" : "s"} and ${r.leadReports} team lead${r.leadReports === 1 ? "" : "s"}.`,
        );
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Couldn't send the report.");
      }
    });
  }

  return (
    <Card padding={0}>
      <VStack gap={1} className="px-5 py-4">
        <Heading level={3}>Monthly spending report</Heading>
        <Text type="supporting">
          Admins get a company-wide report; each team lead gets one for their
          team. It runs automatically each month — use this to send it now.
        </Text>
      </VStack>
      <Divider />
      <VStack gap={3} className="px-5 py-4">
        {err && <Banner status="error" title={err} container="card" />}
        {msg && <Banner status="success" title={msg} container="card" />}
        <HStack>
          <Button
            type="button"
            variant="secondary"
            label={pending ? "Sending…" : "Send report now"}
            onClick={onSend}
            isLoading={pending}
          />
        </HStack>
      </VStack>
    </Card>
  );
}
