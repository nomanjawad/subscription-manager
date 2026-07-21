// m08-teams — admin panel. Server component: fetches team overview, leads and
// the team option list in parallel, then renders the Teams + Team leads
// sections. All mutations happen through the small client controls
// (CreateTeamDialog, AddTeamLeadDialog, AutoApproveToggle, TeamRowActions).
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import {
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import type { TeamOption } from "@/lib/types";
import { getTeamLeads, getTeamOverview, getTeams } from "./queries";
import { AddTeamLeadDialog } from "./AddTeamLeadDialog";
import { AutoApproveToggle } from "./AutoApproveToggle";
import { CreateTeamDialog } from "./CreateTeamDialog";
import {
  DeleteTeamButton,
  ReassignLeadSelect,
  RemoveLeadButton,
} from "./TeamRowActions";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-row items-start justify-between gap-4 px-5 py-4">
        <div>
          <Heading level={3}>{title}</Heading>
          <Text type="supporting">{description}</Text>
        </div>
        {action}
      </div>
      <Divider />
    </>
  );
}

export async function TeamsPanel() {
  const [overview, leads, teams] = await Promise.all([
    getTeamOverview(),
    getTeamLeads(),
    getTeams(),
  ]);

  const teamOptions: TeamOption[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
  }));

  return (
    <div className="space-y-8">
      {/* ── Teams ─────────────────────────────────────────────────────── */}
      <Card padding={0}>
        <SectionHeader
          title="Teams"
          description="Groups for subscriptions, requests and leads."
          action={<CreateTeamDialog />}
        />
        {overview.length === 0 ? (
          <div className="px-5 py-4">
            <Text type="supporting">
              No teams yet. Create your first team to get started.
            </Text>
          </div>
        ) : (
          <Table density="compact">
            <TableRow isHeaderRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Auto-approve</TableHeaderCell>
              <TableHeaderCell className="text-right">Leads</TableHeaderCell>
              <TableHeaderCell className="text-right">Active subs</TableHeaderCell>
              <TableHeaderCell className="text-right">Monthly spend</TableHeaderCell>
              <TableHeaderCell className="text-right">Open requests</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
            {overview.map((team) => (
              <TableRow key={team.team_id}>
                <TableCell className="font-medium text-primary">
                  {team.name}
                </TableCell>
                <TableCell>
                  <AutoApproveToggle
                    teamId={team.team_id}
                    value={team.auto_approve}
                  />
                </TableCell>
                <TableCell className="text-right">{team.lead_count}</TableCell>
                <TableCell className="text-right">
                  {team.subscription_count}
                </TableCell>
                <TableCell className="text-right">
                  {usd.format(team.monthly_spend)}
                </TableCell>
                <TableCell className="text-right">
                  {team.open_request_count}
                </TableCell>
                <TableCell className="text-right">
                  <DeleteTeamButton
                    teamId={team.team_id}
                    teamName={team.name}
                  />
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      {/* ── Team leads ────────────────────────────────────────────────── */}
      <Card padding={0}>
        <SectionHeader
          title="Team leads"
          description="People who can manage their team’s subscriptions."
          action={<AddTeamLeadDialog teams={teamOptions} />}
        />
        {leads.length === 0 ? (
          <div className="px-5 py-4">
            <Text type="supporting">
              No team leads yet.{" "}
              {teamOptions.length === 0
                ? "Create a team first, then add a lead."
                : "Add a lead to give someone access to their team."}
            </Text>
          </div>
        ) : (
          <Table density="compact">
            <TableRow isHeaderRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Team</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium text-primary">
                  {lead.full_name ?? "—"}
                </TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>
                  <ReassignLeadSelect
                    userId={lead.id}
                    teams={teamOptions}
                    currentTeamId={lead.team_id}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <RemoveLeadButton userId={lead.id} />
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
