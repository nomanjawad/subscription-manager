// Thin route — mounts the m06-dashboard module.
import Dashboard from "@/modules/m06-dashboard/Dashboard";
import { getSessionUser } from "@/lib/supabase/auth";
import { Card, CardContent } from "@/components/ui/card";

// The dashboard reads live DB state (RPCs) and is refreshed by the cron
// route / sync APIs, which can't revalidate paths — render it per request
// like /review, instead of baking build-time data into a static page.
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ card?: string }>;
}) {
  // Middleware guarantees an authenticated, role-resolved session on this route.
  const session = await getSessionUser();
  const isTeamLead = session?.role === "team_lead";
  const { card } = await searchParams;
  const cardFilter = typeof card === "string" && card !== "" ? card : undefined;

  // Team lead with no team assigned — nothing to aggregate yet.
  if (isTeamLead && !session?.teamId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <Card size="sm">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t been assigned to a team yet — ask an admin to add
              you to a team.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subtitle = isTeamLead
    ? "your team's subscriptions · verified against Mercury · sandbox"
    : "verified against Mercury · sandbox";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </p>
      </div>
      {isTeamLead ? (
        <Dashboard teamId={session!.teamId!} />
      ) : (
        <Dashboard isAdmin cardFilter={cardFilter} />
      )}
    </div>
  );
}
