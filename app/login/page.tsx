import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Suspense>
        <LoginForm next={next ?? "/"} />
      </Suspense>
    </div>
  );
}
