import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ComicDetailLoading() {
  return (
    <div className="py-8 space-y-8 max-w-5xl mx-auto p-4 sm:p-6 animate-pulse">
      {/* Comic Detail Header Card */}
      <Card className="p-6 sm:p-8 flex flex-col md:flex-row gap-6">
        <Skeleton className="w-full md:w-56 aspect-[3/4] rounded-2xl shrink-0" />
        <div className="space-y-4 flex-1">
          <Skeleton className="h-9 w-3/4 rounded-xl" />
          <div className="flex gap-4">
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>
      </Card>

      {/* Chapter List Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
