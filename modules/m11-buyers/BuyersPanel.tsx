// m11-buyers — admin Buyers panel (async server component). Lists buyer login
// accounts (role='buyer', no team) and how many subscriptions each has bought.
// Mutations happen through the client controls (AddBuyerDialog, RemoveBuyerButton).
import { Badge } from "@astryxdesign/core/Badge";
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
import { AddBuyerDialog } from "./AddBuyerDialog";
import { RemoveBuyerButton } from "./BuyerRowActions";
import { getBuyers } from "./queries";

function fmtDate(ts: string): string {
  return ts ? ts.slice(0, 10) : "—";
}

export async function BuyersPanel() {
  const buyers = await getBuyers();

  return (
    <Card padding={0}>
      <div className="flex flex-row items-start justify-between gap-4 px-5 py-4">
        <div>
          <Heading level={3}>Buyers</Heading>
          <Text type="supporting">
            Buyers sign in to purchase approved requests company-wide. Each
            subscription they buy is stamped with their name.
          </Text>
        </div>
        <AddBuyerDialog />
      </div>
      <Divider />

      {buyers.length === 0 ? (
        <div className="px-5 py-4">
          <Text type="supporting">
            No buyers yet. Add one so approved requests can be purchased.
          </Text>
        </div>
      ) : (
        <Table density="compact">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Purchases</TableHeaderCell>
              <TableHeaderCell>Added</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buyers.map((buyer) => (
              <TableRow key={buyer.id}>
                <TableCell className="font-medium text-primary">
                  {buyer.full_name ?? "—"}
                </TableCell>
                <TableCell>{buyer.email}</TableCell>
                <TableCell>
                  <Badge variant="neutral" label={String(buyer.purchase_count)} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-secondary">
                  {fmtDate(buyer.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <RemoveBuyerButton userId={buyer.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
