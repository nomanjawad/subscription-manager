// Thin route — mounts m05-review.
import { getSessionUser } from "@/lib/supabase/auth";
import ReviewQueue from "@/modules/m05-review/ReviewQueue";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const session = await getSessionUser();

  // Team scoping is server-enforced: a team lead only sees their team's items.
  if (session?.role === "team_lead" && session.teamId === null) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Review queue</h1>
        <p className="text-sm text-muted-foreground">
          You haven&apos;t been assigned to a team yet — ask an admin.
        </p>
      </div>
    );
  }

  const isAdmin = session?.role === "admin";
  const teamId =
    session?.role === "team_lead" ? (session.teamId ?? undefined) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Review queue</h1>
      <ReviewQueue teamId={teamId} isAdmin={isAdmin} />
    </div>
  );
}
