// Second sign-in step: authenticator-app code (Supabase MFA, TOTP). Reached
// only with a Google session that isn't through MFA yet (proxy.ts routes it);
// first-timers enroll an authenticator here, everyone else enters a code.
import { redirect } from "next/navigation";
import { Center } from "@astryxdesign/core/Center";
import { getPendingLogin } from "@/lib/supabase/auth";
import { MfaStep } from "./MfaStep";

export const dynamic = "force-dynamic";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const pending = await getPendingLogin();
  if (!pending) redirect("/login");
  const { gate, email } = pending;
  if (gate.kind === "ok") redirect("/");
  if (gate.kind === "expired" || gate.kind === "invalid") {
    redirect("/login?reason=expired");
  }

  const safeNext = next && /^\/(?![/\\])/.test(next) ? next : "/";
  return (
    <Center axis="both" minHeight="70vh">
      <MfaStep
        mode={gate.kind === "mfa_enroll" ? "enroll" : "verify"}
        email={email}
        next={safeNext}
      />
    </Center>
  );
}
