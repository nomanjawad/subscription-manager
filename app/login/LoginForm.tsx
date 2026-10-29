"use client";

// Login (Astryx). Google is the only way in; the authenticator-code step
// follows on /login/mfa. Only accounts an admin has added can get through
// (enforced in app/auth/callback).
import { useFormStatus } from "react-dom";
import { signInWithGoogle } from "@/lib/auth/actions";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/VStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon, type IconType } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Boxes } from "lucide-react";

const MESSAGES: Record<string, { status: "error" | "warning"; title: string }> = {
  not_allowed: {
    status: "error",
    title: "This Google account hasn't been added. Ask an admin to add your email.",
  },
  oauth: { status: "error", title: "Google sign-in didn't complete. Please try again." },
  expired: {
    status: "warning",
    title: "Your session ended after 30 minutes. Sign in again to continue.",
  },
};

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      label={pending ? "Redirecting to Google…" : "Sign in with Google"}
      type="submit"
      variant="primary"
      isLoading={pending}
      width="100%"
    />
  );
}

export function LoginForm({
  next,
  message,
}: {
  next: string;
  /** error / reason code from the URL (not_allowed, oauth, expired). */
  message?: string;
}) {
  const banner = message ? MESSAGES[message] : undefined;

  return (
    <Card width={380} padding={6}>
      <form action={signInWithGoogle}>
        <VStack gap={4}>
          <VStack gap={2}>
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent-muted">
              <Icon icon={Boxes as unknown as IconType} color="accent" size="lg" />
            </span>
            <VStack gap={1}>
              <Heading level={2}>Subscription Manager</Heading>
              <Text type="supporting">
                Sign in with your Google account. You&apos;ll confirm with your
                authenticator app next. Sessions last 30 minutes.
              </Text>
            </VStack>
          </VStack>

          {banner ? (
            <Banner status={banner.status} title={banner.title} container="card" />
          ) : null}

          <input type="hidden" name="next" value={next} />
          <GoogleButton />
        </VStack>
      </form>
    </Card>
  );
}
