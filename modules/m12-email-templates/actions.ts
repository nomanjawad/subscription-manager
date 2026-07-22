"use server";

// m12-email-templates — admin server action to save an email template. Admin
// only. Stores the Unlayer design JSON (for re-editing) plus the exported HTML
// (what gets sent) and the subject line.
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";

const SUBJECT_MAX = 200;
const HTML_MAX = 200_000; // generous ceiling; Unlayer HTML can be large

export interface SaveTemplateInput {
  subject: string;
  html: string;
  design: unknown;
}

export async function updateEmailTemplate(
  key: string,
  input: SaveTemplateInput,
): Promise<void> {
  await requireAdmin();

  if (typeof key !== "string" || key.length === 0 || key.length > 80) {
    throw new Error("Invalid template key.");
  }

  const subject = input.subject.trim();
  if (!subject) throw new Error("Subject is required.");
  if (subject.length > SUBJECT_MAX) {
    throw new Error(`Subject must be at most ${SUBJECT_MAX} characters.`);
  }

  const html = input.html;
  if (typeof html !== "string" || html.length === 0) {
    throw new Error("Template body is empty — add some content first.");
  }
  if (html.length > HTML_MAX) {
    throw new Error("Template body is too large.");
  }

  const supabase = createServiceClient();
  // Only update existing template rows (keys are seeded by migration).
  const { data, error } = await supabase
    .from("email_templates")
    .update({ subject, html, design: input.design ?? null })
    .eq("key", key)
    .select("key");

  if (error) {
    throw new Error(`Failed to save template: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error("That template no longer exists.");
  }

  revalidatePath("/email-templates");
}
