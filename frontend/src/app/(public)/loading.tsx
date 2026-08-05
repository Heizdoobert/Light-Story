import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 animate-pulse">
      {/* Hero Banner Skeleton */}
      <Skeleton className="h-64 sm:h-80 w-full rounded-3xl" />

      {/* Section Title Skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-6 w-24 rounded-lg" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
