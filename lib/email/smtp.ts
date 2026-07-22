// lib/email — SMTP transport. Provider-agnostic: reads generic SMTP_* env vars
// so any host works (SiteGround, SES, Workspace, self-hosted). Server-only.
//
//   SMTP_HOST   e.g. mail.cuebites.com
//   SMTP_PORT   465 (SSL) or 587 (STARTTLS)
//   SMTP_USER   full mailbox address
//   SMTP_PASS   mailbox password
//   EMAIL_FROM  From: address, e.g. "Subscriptions <notifications@cuebites.com>"
import nodemailer, { type Transporter } from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/** Read + validate SMTP env. Returns null when not configured (so sends no-op). */
export function smtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;
  if (!host || !port || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

let cached: Transporter | null = null;

/** Shared nodemailer transport, or null when SMTP isn't configured. */
export function getTransport(): { transport: Transporter; from: string } | null {
  const config = smtpConfig();
  if (!config) return null;
  if (!cached) {
    cached = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: { user: config.user, pass: config.pass },
    });
  }
  return { transport: cached, from: config.from };
}
