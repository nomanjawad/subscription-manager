"use server";

// m07-requests — admin-only reveal of a request's encrypted credentials.
// Every successful reveal is written to credential_reveals first; if the audit
// row can't be written, nothing is revealed (fail closed).
import { getSessionUser } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptSecret, SECRET_CONTEXT } from "@/lib/crypto/secrets";
import type { RequestCredentials } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function revealRequestCredentials(
  requestId: string,
): Promise<RequestCredentials> {
  if (!UUID_RE.test(requestId)) throw new Error("Invalid request id.");

  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    throw new Error("Only admins can view credentials.");
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("request_credentials")
    .select("ciphertext")
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw new Error("Could not load credentials.");
  if (!data) throw new Error("This request has no credentials.");

  const { error: auditError } = await supabase.from("credential_reveals").insert({
    request_id: requestId,
    revealed_by: session.id,
    revealed_by_email: session.email,
  });
  if (auditError) {
    throw new Error("Could not record this access, so credentials stay hidden.");
  }

  let parsed: Partial<RequestCredentials>;
  try {
    parsed = JSON.parse(
      decryptSecret(data.ciphertext, SECRET_CONTEXT.requestCredentials(requestId)),
    );
  } catch (err) {
    console.error("[m07-requests] credential decryption failed:", err);
    throw new Error(
      "Credentials could not be decrypted — check CREDENTIALS_ENCRYPTION_KEY.",
    );
  }
  return {
    login: parsed.login ?? null,
    password: parsed.password ?? null,
    notes: parsed.notes ?? null,
  };
}
