"use client";

// Login form (Astryx). Astryx inputs are controlled and have no `name`, so we
// mirror each value into a hidden input for the useActionState FormData submit.
import { useActionState, useState } from "react";
import { signIn, type SignInState } from "@/lib/auth/actions";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/VStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";

const initialState: SignInState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Card width={380} padding={6}>
      <form action={formAction}>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Subscription Manager</Heading>
            <Text type="supporting">Sign in to continue.</Text>
          </VStack>

          {state.error ? (
            <Banner status="error" title={state.error} container="card" />
          ) : null}

          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="password" value={password} />

          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(v) => setEmail(v)}
            isRequired
            placeholder="you@company.com"
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={(v) => setPassword(v)}
            isRequired
          />

          <Button
            label={pending ? "Signing in…" : "Sign in"}
            type="submit"
            variant="primary"
            isLoading={pending}
            width="100%"
          />
        </VStack>
      </form>
    </Card>
  );
}
