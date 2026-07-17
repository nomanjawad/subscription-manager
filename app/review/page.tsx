// Thin route — mounts m05-review.
import ReviewQueue from "@/modules/m05-review/ReviewQueue";
import RunChecksButton from "@/modules/m05-review/RunChecksButton";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Review queue</h1>
        <RunChecksButton />
      </div>
      <ReviewQueue />
    </div>
  );
}
