// Admin Settings — email (SMTP) delivery config + the monthly report control,
// and the bank (Mercury) API connection. Two tabs via ?tab=. Admin-only.
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { PageHeader, PageBody } from "@/components/PageHeader";
import { LinkButton } from "@/components/LinkButton";
import { requireAdmin } from "@/lib/supabase/auth";
import { SmtpSettingsCard } from "@/modules/m15-settings/SmtpSettingsCard";
import { BankSettingsCard } from "@/modules/m15-settings/BankSettingsCard";
import { getBankSettings, getSmtpSettings } from "@/modules/m15-settings/queries";
import { MonthlyReportButton } from "@/modules/m14-reports/MonthlyReportButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

type Tab = "email" | "bank";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const tab: Tab = params.tab === "bank" ? "bank" : "email";

  const [smtp, bank] = await Promise.all([
    getSmtpSettings(),
    getBankSettings(),
  ]);

  return (
    <PageBody>
      <PageHeader
        title="Settings"
        subtitle="Configure email delivery and the bank API connection."
      />

      <HStack
        gap={1}
        align="center"
        padding={1}
        className="w-fit rounded-lg border border-default"
      >
        <LinkButton
          href="/admin/settings?tab=email"
          label="Email"
          variant={tab === "email" ? "secondary" : "ghost"}
          size="sm"
        />
        <LinkButton
          href="/admin/settings?tab=bank"
          label="Bank API"
          variant={tab === "bank" ? "secondary" : "ghost"}
          size="sm"
        />
      </HStack>

      {tab === "email" ? (
        <VStack gap={6}>
          <SmtpSettingsCard settings={smtp} />
          <MonthlyReportButton />
        </VStack>
      ) : (
        <BankSettingsCard settings={bank} />
      )}
    </PageBody>
  );
}
