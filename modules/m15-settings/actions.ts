"use server";

// m15-settings — admin server actions for the SMTP config + a test send. Admin
// only. Config lives in the smtp_settings singleton (id=true); lib/email/smtp.ts
// reads it (env vars fill any blanks). A blank password on save keeps the
// existing one (so admins don't have to retype it every edit).
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { sendRawEmail } from "@/lib/email/send";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SmtpInput {
  host: string;
  port: string; // from a text/number input; parsed here
  username: string;
  password: string; // blank = keep existing
  from_email: string;
}

function clean(value: string): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export async function updateSmtpSettings(input: SmtpInput): Promise<void> {
  await requireAdmin();

  const host = clean(input.host);
  const username = clean(input.username);
  const fromEmail = clean(input.from_email);

  let port: number | null = null;
  const portRaw = clean(input.port);
  if (portRaw !== null) {
    port = Number(portRaw);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error("Port must be a number between 1 and 65535.");
    }
  }

  if (fromEmail && !EMAIL_RE.test(fromEmail) && !/</.test(fromEmail)) {
    // Allow either a bare address or a "Name <addr>" form.
    throw new Error("From address must be a valid email (or 'Name <email>').");
  }

  const payload: Record<string, unknown> = {
    id: true,
    host,
    port,
    username,
    from_email: fromEmail,
  };
  // Only overwrite the password when a new one is actually supplied.
  const password = clean(input.password);
  if (password !== null) payload.password = password;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("smtp_settings")
    .upsert(payload, { onConflict: "id" });
  if (error) {
    throw new Error(`Failed to save SMTP settings: ${error.message}`);
  }

  revalidatePath("/users");
}

/** Send a test email to confirm the SMTP config actually works. */
export async function sendTestEmail(to: string): Promise<boolean> {
  await requireAdmin();

  const address = (to ?? "").trim();
  if (!EMAIL_RE.test(address)) {
    throw new Error("Enter a valid email address to test.");
  }

  const sent = await sendRawEmail(
    address,
    "SMTP test — Subscription Manager",
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a">
      <h2 style="margin:0 0 8px">It works! ✅</h2>
      <p>This is a test email from the Subscription Manager. Your SMTP settings are configured correctly.</p>
    </div>`,
  );
  if (!sent) {
    throw new Error(
      "Couldn't send — check the SMTP settings above (host, port, username, password) and try again.",
    );
  }
  return true;
}
