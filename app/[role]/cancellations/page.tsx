// The cancellation list. Visible to all signed-in roles, scoped by role:
//   admin     — everything, filterable by team
//   team_lead — their team's cancellations (read-only)
//   buyer     — the pending queue they finalize (company-wide)
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { LinkButton } from "@/components/LinkButton";
import { requireSession } from "@/lib/supabase/auth";
import { rolePath } from "@/lib/roles";
import { CancellationsPanel } from "@/modules/m13-cancellations/CancellationsPanel";
import { getCancellations } from "@/modules/m13-cancellations/queries";
import { getTeamsPublic } from "@/modules/m08-teams/queries";
import type { CancellationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cancellations" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CancellationsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const basePath = rolePath(session.role, "cancellations");

  // Team lead with no team can't see anything scoped.
  if (session.role === "team_lead" && session.teamId === null) {
    return (
      <div className="space-y-6">
        <Heading level={1}>Cancellations</Heading>
        <Card padding={5}>
          <Text type="supporting">
            You haven&apos;t been assigned to a team yet — ask an admin.
          </Text>
        </Card>
      </div>
    );
  }

  const isAdmin = session.role === "admin";
  const canComplete = session.role === "buyer" || isAdmin;

  // Scope: team leads to their team; admins to an optional ?team filter;
  // buyers see the company-wide pending queue.
  const adminTeamFilter =
    isAdmin && params.team && UUID_RE.test(params.team)
      ? params.team
      : undefined;
  const teamId =
    session.role === "team_lead"
      ? (session.teamId ?? undefined)
      : adminTeamFilter;
  const status: CancellationStatus | undefined =
    session.role === "buyer" ? "pending" : undefined;

  const [rows, teams] = await Promise.all([
    getCancellations({ teamId, status }),
    isAdmin ? getTeamsPublic() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Heading level={1}>Cancellations</Heading>
        <Text type="supporting">
          {session.role === "buyer"
            ? "Pending cancellations to action. Marking one cancelled ends the subscription."
            : "Subscriptions requested for cancellation. Buyers complete them."}
        </Text>
      </div>

      {isAdmin && teams.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <LinkButton
            href={basePath}
            label="All teams"
            variant={adminTeamFilter ? "ghost" : "secondary"}
            size="sm"
          />
          {teams.map((t) => (
            <LinkButton
              key={t.id}
              href={`${basePath}?team=${t.id}`}
              label={t.name}
              variant={adminTeamFilter === t.id ? "secondary" : "ghost"}
              size="sm"
            />
          ))}
        </div>
      )}

      <CancellationsPanel rows={rows} canComplete={canComplete} />
    </div>
  );
}
