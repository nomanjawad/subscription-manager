// Thin route — mounts the m06-dashboard module.
import Dashboard from "@/modules/m06-dashboard/Dashboard";

// The dashboard reads live DB state (RPCs) and is refreshed by the cron
// route / sync APIs, which can't revalidate paths — render it per request
// like /review, instead of baking build-time data into a static page.
export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          verified against Mercury · sandbox
        </p>
      </div>
      <Dashboard />
    </div>
  );
}
