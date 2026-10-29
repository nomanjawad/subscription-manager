// m12-admins — Admins panel (async server component). Lists admin login
// accounts; this list is the admin allow list. Mutations happen through the
// client controls (AddAdminDialog, RemoveAdminButton).
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { AddAdminDialog } from "./AddAdminDialog";
import { RemoveAdminButton } from "./AdminRowActions";
import { getAdmins } from "./queries";

function fmtDate(ts: string): string {
  return ts ? ts.slice(0, 10) : "—";
}

export async function AdminsPanel({ currentUserId }: { currentUserId: string }) {
  const admins = await getAdmins();
  const canRemove = admins.length > 1;

  return (
    <Card padding={0}>
      <HStack justify="between" align="start" gap={4} paddingInline={5} paddingBlock={4}>
        <VStack gap={1}>
          <Heading level={3}>Admins</Heading>
          <Text type="supporting">
            Admins have full access. Only the Google accounts listed here can
            sign in as an admin; removing one ends their access immediately.
          </Text>
        </VStack>
        <AddAdminDialog />
      </HStack>
      <Divider />

      <Table density="compact">
        <TableHeader>
          <TableRow isHeaderRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Google email</TableHeaderCell>
            <TableHeaderCell>Added</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.id}>
              <TableCell>
                <Text size="sm" weight="medium">
                  {admin.full_name ?? "—"}
                </Text>
              </TableCell>
              <TableCell>
                {admin.email}
                {admin.id === currentUserId ? (
                  <Text size="xsm" type="supporting"> (you)</Text>
                ) : null}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Text size="sm" type="supporting">{fmtDate(admin.created_at)}</Text>
              </TableCell>
              <TableCell className="text-right">
                {admin.id !== currentUserId && canRemove ? (
                  <RemoveAdminButton userId={admin.id} />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
