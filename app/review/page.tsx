// Thin route — mounts m05-review.
import ReviewQueue from "@/modules/m05-review/ReviewQueue";
import RunChecksButton from "@/modules/m05-review/RunChecksButton";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Review queue
        </h1>
        <RunChecksButton />
      </div>
      <ReviewQueue />
    </main>
  );
}
