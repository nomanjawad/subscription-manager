// m10-users — admin Users panel. Server component: fetches the member directory
// and the team-lead options in parallel, then renders the directory table.
// Members are non-login users assigned to a team lead. All mutations happen
// through the small client controls (AddUserDialog, UserRowActions).
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Badge } from "@astryxdesign/core/Badge";
import { AddUserDialog } from "./AddUserDialog";
import { ReassignUserSelect, RemoveUserButton } from "./UserRowActions";
import {
  getLeadOptions,
  getMembers,
  getUnrecognizedRequesters,
} from "./queries";
import { SmtpSettingsCard } from "@/modules/m15-settings/SmtpSettingsCard";
import { getSmtpSettings } from "@/modules/m15-settings/queries";
import { MonthlyReportButton } from "@/modules/m14-reports/MonthlyReportButton";

function fmtDate(ts: string | null): string {
  return ts ? ts.slice(0, 10) : "—";
}

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

export async function UsersPanel() {
  const [members, leads, unrecognized, smtp] = await Promise.all([
    getMembers(),
    getLeadOptions(),
    getUnrecognizedRequesters(),
    getSmtpSettings(),
  ]);

  return (
    <div className="space-y-8">
    <Card padding={0}>
      <SectionHeader
        title="Users"
        description="People who can only submit subscription requests. Each is assigned to a team lead who handles their requests."
        action={<AddUserDialog leads={leads} />}
      />
      {members.length === 0 ? (
        <div className="px-5 py-4">
          <Text type="supporting">
            No users yet.{" "}
            {leads.length === 0
              ? "Add a team lead first, then add users under them."
              : "Add a user and assign them to a team lead."}
          </Text>
        </div>
      ) : (
        <Table density="compact">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Team lead</TableHeaderCell>
              <TableHeaderCell>Team</TableHeaderCell>
              <TableHeaderCell>Requests</TableHeaderCell>
              <TableHeaderCell>Last request</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium text-primary">
                  {member.full_name ?? "—"}
                </TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <ReassignUserSelect
                    memberId={member.id}
                    leads={leads}
                    currentLeadId={member.lead_id}
                  />
                </TableCell>
                <TableCell>
                  {member.team_name ?? (
                    <span className="text-secondary">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="neutral" label={String(member.request_count)} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-secondary">
                  {fmtDate(member.last_requested_at)}
                </TableCell>
                <TableCell className="text-right">
                  <RemoveUserButton memberId={member.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>

    {unrecognized.length > 0 && (
      <Card padding={0}>
        <SectionHeader
          title="Unrecognized requesters"
          description="These emails submitted requests but aren't registered users, so their requests weren't auto-routed to a team. Add them as users to route future requests."
          action={null}
        />
        <Table density="compact">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Requests</TableHeaderCell>
              <TableHeaderCell>Last request</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unrecognized.map((r) => (
              <TableRow key={r.requester_email}>
                <TableCell className="font-medium text-primary">
                  {r.requester_name ?? "—"}
                </TableCell>
                <TableCell>{r.requester_email}</TableCell>
                <TableCell>
                  <Badge variant="neutral" label={String(r.request_count)} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-secondary">
                  {fmtDate(r.last_requested_at)}
                </TableCell>
                <TableCell className="text-right">
                  <AddUserDialog
                    leads={leads}
                    initialName={r.requester_name ?? ""}
                    initialEmail={r.requester_email}
                    triggerLabel="Add as user"
                    triggerVariant="secondary"
                    triggerSize="sm"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )}

    <SmtpSettingsCard settings={smtp} />
    <MonthlyReportButton />
    </div>
  );
}
