// Thin admin route — the Unlayer email-template editor. Admin-only.
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { requireAdmin } from "@/lib/supabase/auth";
import { EmailTemplatesManager } from "@/modules/m12-email-templates/EmailTemplatesManager";
import { getEmailTemplates } from "@/modules/m12-email-templates/queries";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Email templates",
};

export default async function EmailTemplatesPage() {
  await requireAdmin();
  const templates = await getEmailTemplates();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Heading level={1}>Email templates</Heading>
        <Text type="supporting">
          Customize the transactional emails. Drop merge tags like{" "}
          {"{{requester_name}}"} into the body — they&apos;re filled in per
          recipient when the email is sent.
        </Text>
      </div>
      <EmailTemplatesManager templates={templates} />
    </div>
  );
}
