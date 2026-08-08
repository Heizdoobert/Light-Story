import { Skeleton } from "@/components/ui/skeleton";

export default function ErrorsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Skeleton className="h-96 w-full max-w-md rounded-3xl" />
    </div>
  );
}
