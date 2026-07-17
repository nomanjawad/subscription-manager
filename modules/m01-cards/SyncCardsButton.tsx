// m01-cards — "Sync cards from Mercury" button. Server component: a plain
// form posting to the syncCardsAction server action, no client JS needed.
import { syncCardsAction } from "./actions";

export function SyncCardsButton() {
  return (
    <form action={syncCardsAction}>
      <button
        type="submit"
        className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        Sync cards from Mercury
      </button>
    </form>
  );
}
