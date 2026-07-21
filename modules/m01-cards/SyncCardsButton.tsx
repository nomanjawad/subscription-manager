// m01-cards — "Sync cards from Mercury" button. Server component: a plain
// form posting to the syncCardsAction server action, no client JS needed.
import { Button } from "@astryxdesign/core/Button";
import { syncCardsAction } from "./actions";

export function SyncCardsButton() {
  return (
    <form action={syncCardsAction}>
      <Button
        label="Sync cards from Mercury"
        type="submit"
        variant="secondary"
      />
    </form>
  );
}
