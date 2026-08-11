import { Skeleton } from '@/components/ui/skeleton';

export default function RootLoading() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-pulse">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
