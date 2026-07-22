// lib/email — SMTP transport. Config comes from the smtp_settings table (edited
// by an admin on the Users page) and falls back to SMTP_* env vars for anything
// left blank. Provider-agnostic — any host works (SkyTech BPO webmail, SES,
// Workspace, self-hosted). Server-only (service client + nodemailer).
//
//   host        e.g. mail.skytechbpo.com
//   port        465 (implicit TLS) or 587 (STARTTLS)
//   username    full mailbox address, e.g. notifications@skytechbpo.com
//   password    mailbox password
//   from_email  From: address, e.g. "Subscriptions <notifications@skytechbpo.com>"
import nodemailer, { type Transporter } from "nodemailer";
import { createServiceClient } from "@/lib/supabase/server";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/** Read the admin-editable smtp_settings row, or null if none/unreadable. */
async function dbSettings(): Promise<Partial<SmtpConfig> | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("smtp_settings")
      .select("host, port, username, password, from_email")
      .maybeSingle();
    if (error || !data) return null;
    return {
      host: data.host ?? undefined,
      port: data.port ?? undefined,
      user: data.username ?? undefined,
      pass: data.password ?? undefined,
      from: data.from_email ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the effective SMTP config: DB settings win, env fills the gaps.
 * Returns null when the essentials (host/port/user/pass) aren't all present.
 */
export async function smtpConfig(): Promise<SmtpConfig | null> {
  const db = (await dbSettings()) ?? {};
  const host = db.host || process.env.SMTP_HOST || "";
  const portRaw = db.port ?? Number(process.env.SMTP_PORT);
  const port = Number(portRaw);
  const user = db.user || process.env.SMTP_USER || "";
  const pass = db.pass || process.env.SMTP_PASS || "";
  const from = db.from || process.env.EMAIL_FROM || user;
  if (!host || !port || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

let cached: { key: string; transport: Transporter } | null = null;

/**
 * Shared nodemailer transport, or null when SMTP isn't configured. Cached by a
 * fingerprint of the config so editing the settings rebuilds the transport.
 */
export async function getTransport(): Promise<{
  transport: Transporter;
  from: string;
} | null> {
  const config = await smtpConfig();
  if (!config) return null;

  const key = `${config.host}:${config.port}:${config.user}`;
  if (!cached || cached.key !== key) {
    cached = {
      key,
      transport: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465, // 465 = implicit TLS; 587 = STARTTLS
        auth: { user: config.user, pass: config.pass },
      }),
    };
  }
  return { transport: cached.transport, from: config.from };
}
