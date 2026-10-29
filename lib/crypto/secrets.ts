// Application-level encryption for secrets stored in the database (request
// credentials, SMTP password, Mercury token). AES-256-GCM via Node's crypto —
// the key lives only in the app's environment (CREDENTIALS_ENCRYPTION_KEY), so
// the database (and anyone holding a Supabase key) only ever sees ciphertext.
//
// Stored format: "v1:<iv>:<auth tag>:<ciphertext>" (base64 parts). Every value
// is bound to a context string (AAD) naming where it lives, e.g.
// "request_credentials:<request id>", so a ciphertext copied onto another row
// or column fails to decrypt instead of revealing someone else's secret.
//
// Server-only: never import this from a client component.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12; // GCM standard nonce size
const KEY_BYTES = 32; // AES-256

function key(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY is not set.");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32).",
    );
  }
  return buf;
}

export function encryptSecret(plaintext: string, context: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(stored: string, context: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unrecognized encrypted value format.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  // final() throws if the key, context, or ciphertext doesn't match.
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Decrypt, or null when the value is missing or can't be decrypted (logged,
 *  never thrown) — for config reads that should fall back rather than crash. */
export function tryDecryptSecret(
  stored: string | null | undefined,
  context: string,
): string | null {
  if (!stored) return null;
  try {
    return decryptSecret(stored, context);
  } catch (err) {
    console.error(`[secrets] could not decrypt ${context}:`, err);
    return null;
  }
}

/** AAD contexts — one per stored secret location. */
export const SECRET_CONTEXT = {
  requestCredentials: (requestId: string) => `request_credentials:${requestId}`,
  smtpPassword: "smtp_settings.password",
  bankApiToken: "bank_settings.api_token",
} as const;
