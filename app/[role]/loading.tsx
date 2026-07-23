// Shared loading fallback for every authenticated section. Next uses the
// nearest loading.tsx as the Suspense boundary for a segment, so this one file
// covers all /[role]/* pages — navigation shows a layout-matched shimmer while
// each page's server data loads.
import { PageSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return <PageSkeleton />;
}
