import { Suspense } from "react";
import { Center } from "@astryxdesign/core/Center";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}) {
  const { next, error, reason } = await searchParams;
  return (
    <Center axis="both" minHeight="70vh">
      <Suspense>
        <LoginForm next={next ?? "/"} message={error ?? reason} />
      </Suspense>
    </Center>
  );
}
