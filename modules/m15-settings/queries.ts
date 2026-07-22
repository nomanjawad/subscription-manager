// m15-settings — read the admin-editable SMTP config (smtp_settings singleton).
// The password is NEVER returned to the client; we expose only whether one is
// set. Service client only (RLS deny-all).
import { createServiceClient } from "@/lib/supabase/server";
import type { SmtpSettingsRow } from "@/lib/types";

export interface SmtpSettingsView {
  host: string;
  port: number | null;
  username: string;
  from_email: string;
  hasPassword: boolean;
  updated_at: string | null;
}

export interface BankSettingsView {
  api_url: string;
  hasToken: boolean;
  updated_at: string | null;
}

export async function getBankSettings(): Promise<BankSettingsView> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bank_settings")
    .select("api_url, api_token, updated_at")
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load bank settings: ${error.message}`);
  }
  const row = (data as {
    api_url: string | null;
    api_token: string | null;
    updated_at: string | null;
  } | null) ?? null;
  return {
    api_url: row?.api_url ?? "",
    hasToken: Boolean(row?.api_token),
    updated_at: row?.updated_at ?? null,
  };
}

export async function getSmtpSettings(): Promise<SmtpSettingsView> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("smtp_settings")
    .select("host, port, username, password, from_email, updated_at")
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load SMTP settings: ${error.message}`);
  }
  const row = (data as SmtpSettingsRow | null) ?? null;
  return {
    host: row?.host ?? "",
    port: row?.port ?? null,
    username: row?.username ?? "",
    from_email: row?.from_email ?? "",
    hasPassword: Boolean(row?.password),
    updated_at: row?.updated_at ?? null,
  };
}
