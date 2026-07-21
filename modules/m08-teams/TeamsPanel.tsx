// m08-teams — admin panel. Server component: fetches team overview, leads and
// the team option list in parallel, then renders the Teams + Team leads
// sections. All mutations happen through the small client controls
// (CreateTeamDialog, AddTeamLeadDialog, AutoApproveToggle, TeamRowActions).
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Teams</CardTitle>
            <CardDescription>
              Groups for subscriptions, requests and leads.
            </CardDescription>
          </div>
          <CreateTeamDialog />
        </CardHeader>
        <CardContent>
          {overview.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No teams yet. Create your first team to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Auto-approve</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Active subs</TableHead>
                    <TableHead className="text-right">Monthly spend</TableHead>
                    <TableHead className="text-right">Open requests</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.map((team) => (
                    <TableRow key={team.team_id}>
                      <TableCell className="font-medium">
                        {team.name}
                      </TableCell>
                      <TableCell>
                        <AutoApproveToggle
                          teamId={team.team_id}
                          value={team.auto_approve}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {team.lead_count}
                      </TableCell>
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
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Team leads ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Team leads</CardTitle>
            <CardDescription>
              People who can manage their team&rsquo;s subscriptions.
            </CardDescription>
          </div>
          <AddTeamLeadDialog teams={teamOptions} />
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No team leads yet.{" "}
              {teamOptions.length === 0
                ? "Create a team first, then add a lead."
                : "Add a lead to give someone access to their team."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
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
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
