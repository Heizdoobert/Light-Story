import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Admin Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      {/* Admin Content Table Skeleton */}
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}
