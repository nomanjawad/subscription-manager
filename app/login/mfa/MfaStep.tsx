"use client";

// Authenticator step. Runs in the browser with the auth-only Supabase client
// (same cookies as the server), so the upgraded aal2 session is visible to
// the server on the next request.
//   enroll → clear stale unverified factors, create a TOTP factor, show its QR
//            code + setup key, confirm with a first code.
//   verify → challenge the user's verified TOTP factor with their code.
import { useEffect, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { createBrowserAuthClient } from "@/lib/supabase/browser";
import { signOut } from "@/lib/auth/actions";

interface Enrollment {
  factorId: string;
  qrCode: string; // SVG data URL
  secret: string;
}

export function MfaStep({
  mode,
  email,
  next,
}: {
  mode: "enroll" | "verify";
  email: string;
  next: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (mode !== "enroll" || started.current) return;
    started.current = true; // React dev double-invokes effects
    void (async () => {
      const supabase = createBrowserAuthClient();
      // Drop leftovers from an abandoned earlier setup.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
      });
      if (enrollError || !data) {
        setError("Couldn't start authenticator setup. Reload the page to try again.");
        return;
      }
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    })();
  }, [mode]);

  async function submit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const clean = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(clean)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createBrowserAuthClient();

    let factorId = enrollment?.factorId ?? null;
    if (mode === "verify") {
      const { data } = await supabase.auth.mfa.listFactors();
      factorId = data?.totp[0]?.id ?? null;
    }
    if (!factorId) {
      setBusy(false);
      setError("No authenticator found for this account. Ask an admin to reset it.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: clean,
    });
    if (verifyError) {
      setBusy(false);
      setCode("");
      setError("That code didn't work. Check your app and try again.");
      return;
    }
    // Full navigation so the server sees the upgraded session cookies.
    window.location.assign(next);
  }

  return (
    <Card width={400} padding={6}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2}>
            {mode === "enroll" ? "Set up your authenticator" : "Enter your code"}
          </Heading>
          <Text type="supporting">
            {mode === "enroll"
              ? `Two-factor sign-in is required. Scan this QR code with Google Authenticator, 1Password, Authy or similar, then enter the 6-digit code it shows. Signed in as ${email}.`
              : `Open your authenticator app and enter the 6-digit code. Signed in as ${email}.`}
          </Text>
        </VStack>

        {mode === "enroll" ? (
          enrollment ? (
            <VStack gap={2} align="center">
              {/* QR codes need a light background to scan, even in dark mode. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollment.qrCode}
                alt="Authenticator QR code"
                className="size-48 rounded-lg bg-white p-2"
              />
              <Text size="xsm" type="supporting">
                Can&apos;t scan? Enter this key: {enrollment.secret}
              </Text>
            </VStack>
          ) : !error ? (
            <Text type="supporting">Preparing your QR code…</Text>
          ) : null
        ) : null}

        {error ? <Banner status="error" title={error} container="card" /> : null}

        <form onSubmit={submit}>
          <VStack gap={3}>
            <TextInput
              label="6-digit code"
              value={code}
              onChange={setCode}
              placeholder="123456"
              hasAutoFocus
              isDisabled={mode === "enroll" && !enrollment}
            />
            <Button
              label={busy ? "Verifying…" : mode === "enroll" ? "Turn on and continue" : "Verify"}
              type="submit"
              variant="primary"
              isLoading={busy}
              width="100%"
            />
          </VStack>
        </form>

        <form action={signOut}>
          <Button
            label="Use a different Google account"
            type="submit"
            variant="ghost"
            width="100%"
          />
        </form>
      </VStack>
    </Card>
  );
}
