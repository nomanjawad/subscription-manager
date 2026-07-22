// lib/email — the send layer. Loads a template (DB → fallback), fills merge
// tags, and sends via SMTP. Every send is best-effort: failures are logged and
// swallowed so a request action never fails just because email is down or SMTP
// isn't configured yet. Server-only (service client + nodemailer).
import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATES, type EmailTemplateKey } from "./defaults";
import { mergeHtml, mergeText, type MergeVars } from "./merge";
import { getTransport } from "./smtp";

interface LoadedTemplate {
  subject: string;
  html: string;
}

/** Load a template from the DB, falling back to the built-in default. */
async function loadTemplate(key: EmailTemplateKey): Promise<LoadedTemplate> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("subject, html")
      .eq("key", key)
      .maybeSingle();
    if (!error && data) {
      return { subject: data.subject as string, html: data.html as string };
    }
  } catch {
    // fall through to the built-in default
  }
  const fallback = DEFAULT_TEMPLATES[key];
  return { subject: fallback.subject, html: fallback.html };
}

/**
 * Send one templated email to one or more recipients. Best-effort: returns
 * false (and logs) on any failure instead of throwing. No-ops (returns false)
 * when SMTP isn't configured or there are no recipients.
 */
export async function sendTemplateEmail(
  key: EmailTemplateKey,
  to: string | string[],
  vars: MergeVars,
): Promise<boolean> {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((e) => e.trim())
    .filter(Boolean);
  if (recipients.length === 0) return false;

  const wired = getTransport();
  if (!wired) {
    console.info(`[email] SMTP not configured — skipping "${key}".`);
    return false;
  }

  try {
    const template = await loadTemplate(key);
    await wired.transport.sendMail({
      from: wired.from,
      to: recipients,
      subject: mergeText(template.subject, vars),
      html: mergeHtml(template.html, vars),
    });
    return true;
  } catch (err) {
    console.error(`[email] failed to send "${key}":`, err);
    return false;
  }
}
