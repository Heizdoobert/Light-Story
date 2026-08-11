import { Skeleton } from "@/components/ui/skeleton";

export default function ChapterReaderLoading() {
  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto p-4 animate-pulse">
      {/* Sticky Reader Header Skeleton */}
      <Skeleton className="h-16 w-full rounded-2xl" />

      {/* Comic Page Skeletons */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-[750px] w-full rounded-2xl" />
        <Skeleton className="h-[750px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
