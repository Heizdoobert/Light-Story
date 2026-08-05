import { Skeleton } from "@/components/ui/skeleton";

export default function UserLoading() {
  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6 p-4 animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="lg:col-span-2 h-96 w-full rounded-2xl" />
      </div>
    </div>
  );
}
