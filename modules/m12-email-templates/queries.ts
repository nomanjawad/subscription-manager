// m12-email-templates — read queries for the admin Email templates editor.
// Service client only (RLS deny-all).
import { createServiceClient } from "@/lib/supabase/server";
import type { EmailTemplateRow } from "@/lib/types";

/** All email templates, ordered by name. */
export async function getEmailTemplates(): Promise<EmailTemplateRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("key, name, subject, html, design, updated_at")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load email templates: ${error.message}`);
  }
  return (data ?? []) as EmailTemplateRow[];
}
