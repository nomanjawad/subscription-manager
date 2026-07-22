// lib/email — the send layer. Templates live in code (defaults.ts); this fills
// their merge tags and sends via SMTP. Every send is best-effort: failures are
// logged and swallowed so a user action never fails just because email is down
// or SMTP isn't configured yet. Server-only (nodemailer + service client).
import { DEFAULT_TEMPLATES, type EmailTemplateKey } from "./defaults";
import { mergeHtml, mergeText, type MergeVars } from "./merge";
import { getTransport } from "./smtp";

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
  const template = DEFAULT_TEMPLATES[key];
  return sendRawEmail(
    to,
    mergeText(template.subject, vars),
    mergeHtml(template.html, vars),
  );
}

/**
 * Send raw subject + HTML (already assembled — no merge). Used by the monthly
 * report, whose body is generated HTML that must NOT be merge-escaped. Same
 * best-effort contract as sendTemplateEmail.
 */
export async function sendRawEmail(
  to: string | string[],
  subject: string,
  html: string,
): Promise<boolean> {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((e) => e.trim())
    .filter(Boolean);
  if (recipients.length === 0) return false;

  const wired = await getTransport();
  if (!wired) {
    console.info("[email] SMTP not configured — skipping send.");
    return false;
  }

  try {
    await wired.transport.sendMail({
      from: wired.from,
      to: recipients,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email] failed to send:", err);
    return false;
  }
}
