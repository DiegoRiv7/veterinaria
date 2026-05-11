import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-4 w-[55%] rounded-full mt-3" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-[10px]" />
          <Skeleton className="h-10 w-44 rounded-[10px]" />
          <Skeleton className="h-10 w-28 rounded-[10px]" />
        </div>
      </div>
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[136px] w-full rounded-[20px]" />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px] w-full rounded-[18px]" />
        ))}
      </div>
    </div>
  );
}
