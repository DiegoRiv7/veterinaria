import { Skeleton, SkeletonCard, SkeletonRow } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-[55%] rounded-full" />
        <Skeleton className="h-4 w-[30%] rounded-full mt-3" />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} iconSize={44} showRight={false} />
        ))}
      </div>
    </div>
  );
}
