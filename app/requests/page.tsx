// Thin admin route — mounts the m07-requests panel. Middleware guards access.
import { RequestsPanel } from "@/modules/m07-requests/RequestsPanel";

export const metadata = {
  title: "Subscription requests",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Subscription requests
      </h1>
      <RequestsPanel tab={tab} />
    </div>
  );
}
