// Thin admin route — mounts the m07-requests panel. Middleware guards access.
import { getSessionUser } from "@/lib/supabase/auth";
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
  const session = await getSessionUser();

  // Team leads only ever see their own team's requests; an unassigned lead
  // can't see anything yet. Admins (teamId omitted) see everything.
  if (session?.role === "team_lead") {
    if (!session.teamId) {
      return (
        <div className="space-y-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Subscription requests
          </h1>
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            You haven&apos;t been assigned to a team yet — ask an admin.
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Subscription requests
        </h1>
        <RequestsPanel tab={tab} teamId={session.teamId} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Subscription requests
      </h1>
      <RequestsPanel tab={tab} />
    </div>
  );
}
