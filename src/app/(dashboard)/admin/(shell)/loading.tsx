import { Skeleton } from "@/components/admin/ui";

/// Shown while a server-rendered admin page loads its data. Mirrors the
/// common page shape (header, cards, list) so nothing jumps when it arrives.
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 border-b border-line pb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-2xl" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
