import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Skeleton className="h-8 w-40 rounded-full" />
        <Skeleton className="h-4 w-[60%] rounded-full mt-3" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[16px]" />
        ))}
      </div>
    </div>
  );
}
