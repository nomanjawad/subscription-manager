// Admin Settings — email (SMTP) delivery config + the monthly report control,
// and the bank (Mercury) API connection. Two tabs via ?tab=. Admin-only.
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
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
    <div className="space-y-6">
      <div className="space-y-1">
        <Heading level={1}>Settings</Heading>
        <Text type="supporting">
          Configure email delivery and the bank API connection.
        </Text>
      </div>

      <div className="inline-flex items-center gap-1 rounded-lg border border-default p-1">
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
      </div>

      {tab === "email" ? (
        <div className="space-y-6">
          <SmtpSettingsCard settings={smtp} />
          <MonthlyReportButton />
        </div>
      ) : (
        <BankSettingsCard settings={bank} />
      )}
    </div>
  );
}
