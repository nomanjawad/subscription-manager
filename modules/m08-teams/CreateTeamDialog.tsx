"use client";

// m08-teams — "New team" dialog. Submits to createTeam inside a transition; on
// success it closes and refreshes the teams table.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createTeam, type CreateTeamState } from "./actions";

const initialState: CreateTeamState = { ok: false, error: null };

export function CreateTeamDialog() {
  const [open, setOpen] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTeam(initialState, formData);
      if (result.ok) {
        setOpen(false);
        setAutoApprove(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">New team</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New team</DialogTitle>
          <DialogDescription>
            Create a team to group subscriptions, requests and leads.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              name="name"
              required
              maxLength={80}
              placeholder="e.g. Design"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="team-auto-approve">Auto-approve requests</Label>
              <p className="text-xs text-muted-foreground">
                New requests from this team skip manual review.
              </p>
            </div>
            <Switch
              id="team-auto-approve"
              checked={autoApprove}
              onCheckedChange={setAutoApprove}
            />
            {/* Hidden field carries the switch value into the form post. */}
            <input
              type="hidden"
              name="auto_approve"
              value={autoApprove ? "on" : "off"}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
