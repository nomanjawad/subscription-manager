"use client";

// m07-requests — public request form (/request). Posts to submitRequest via
// useActionState; on success it swaps to a thank-you state with a
// "Submit another" button that remounts the form (key bump resets everything).
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TeamOption } from "@/lib/types";
import { TeamPicker } from "@/modules/m08-teams/TeamPicker";
import { submitRequest, type SubmitState } from "./actions";

const initialState: SubmitState = { ok: false, error: null };

export function RequestForm({ teams }: { teams: TeamOption[] }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <RequestFormInner
      key={formKey}
      teams={teams}
      onReset={() => setFormKey((k) => k + 1)}
    />
  );
}

function RequestFormInner({
  teams,
  onReset,
}: {
  teams: TeamOption[];
  onReset: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    submitRequest,
    initialState,
  );

  if (state.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Request submitted</CardTitle>
          <CardDescription>
            Thanks! The admin team will review your request and get back to
            you by email.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button type="button" variant="outline" onClick={onReset}>
            Submit another
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New request</CardTitle>
        <CardDescription>
          Tell us what you need — fields marked * are required.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="requester_name">Your name *</Label>
            <Input
              id="requester_name"
              name="requester_name"
              required
              maxLength={200}
              placeholder="Jane Doe"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="requester_email">Your email *</Label>
            <Input
              id="requester_email"
              name="requester_email"
              type="email"
              required
              maxLength={200}
              placeholder="jane@company.com"
            />
          </div>

          {teams.length > 0 ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Team / category *</Label>
              <TeamPicker
                teams={teams}
                name="team_id"
                required
                placeholder="Choose a team"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              No teams have been set up yet — your request will be submitted
              unassigned.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="platform">Platform *</Label>
            <Input
              id="platform"
              name="platform"
              required
              maxLength={200}
              placeholder="e.g. Figma"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product">Product / plan</Label>
            <Input
              id="product"
              name="product"
              maxLength={200}
              placeholder="e.g. Professional plan"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount_estimate">Estimated cost</Label>
            <Input
              id="amount_estimate"
              name="amount_estimate"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="billing_cycle">Billing cycle</Label>
            <Select name="billing_cycle" defaultValue="monthly">
              <SelectTrigger id="billing_cycle" className="w-full">
                <SelectValue placeholder="Billing cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="reason">Why do you need it?</Label>
            <Textarea
              id="reason"
              name="reason"
              rows={3}
              maxLength={2000}
              placeholder="A sentence or two helps us review faster."
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive sm:col-span-2" role="alert">
              {state.error}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit request"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
