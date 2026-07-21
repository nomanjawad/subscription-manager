"use client";

// m08-teams — "Add team lead" dialog. Creates a GoTrue account + profile via
// addTeamLead. The password is temporary; the lead can change it after their
// first sign-in. Uses useTransition (addTeamLead throws on error) rather than
// useActionState so we can surface thrown messages inline.
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
import type { TeamOption } from "@/lib/types";
import { addTeamLead } from "./actions";
import { TeamPicker } from "./TeamPicker";

export function AddTeamLeadDialog({ teams }: { teams: TeamOption[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const hasTeams = teams.length > 0;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await addTeamLead(formData);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Something went wrong. Try again.",
        );
      }
    });
  }

  // When there are no teams the trigger is disabled outright (not just a
  // wrapped span, which would still capture the click and open the dialog).
  if (!hasTeams) {
    return (
      <Button type="button" disabled title="Create a team first.">
        Add team lead
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Add team lead</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add team lead</DialogTitle>
          <DialogDescription>
            Creates a login for a team lead. The password is temporary — they
            can change it after signing in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lead-full-name">Full name</Label>
            <Input
              id="lead-full-name"
              name="full_name"
              maxLength={200}
              placeholder="Jane Doe"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-email">Email</Label>
            <Input
              id="lead-email"
              name="email"
              type="email"
              required
              maxLength={200}
              placeholder="jane@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-password">Temporary password</Label>
            <Input
              id="lead-password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Team</Label>
            <TeamPicker teams={teams} name="team_id" required />
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
              {pending ? "Adding…" : "Add team lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
