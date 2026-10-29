"use client";

// m02-subscriptions — "Export" menu. Downloads the rows matching the current
// URL filters as CSV or XLSX from /api/export/subscriptions, which re-applies
// the same filters plus the session's server-enforced scope.
import { useSearchParams } from "next/navigation";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";

type ExportFormat = "csv" | "xlsx";

export function ExportMenu() {
  const searchParams = useSearchParams();

  function download(format: ExportFormat): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", format);
    // A plain navigation: the route answers with Content-Disposition:
    // attachment, so the browser saves the file and stays on this page.
    window.location.assign(`/api/export/subscriptions?${params.toString()}`);
  }

  return (
    <DropdownMenu
      button={{ label: "Export", variant: "secondary" }}
      menuWidth={180}
      items={[
        { label: "Download CSV", onClick: () => download("csv") },
        { label: "Download Excel (.xlsx)", onClick: () => download("xlsx") },
      ]}
    />
  );
}
