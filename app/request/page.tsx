// Thin public route — anyone can ask for a subscription here (no login).
import { RequestForm } from "@/modules/m07-requests/RequestForm";

export const metadata = {
  title: "Request a subscription",
};

export default function RequestPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Request a subscription
        </h1>
        <p className="text-sm text-muted-foreground">
          Need a tool or service for work? Fill in the form below and the
          admin team will review your request.
        </p>
      </div>

      <RequestForm />
    </div>
  );
}
