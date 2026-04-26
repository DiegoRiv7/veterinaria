import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-dvh flex flex-col px-6 py-8 relative z-10">
      <Skeleton className="h-4 w-16 rounded-full" />
      <div className="mx-auto w-full max-w-sm flex-1 flex flex-col justify-center">
        {/* Brand logo block */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Skeleton className="h-16 w-16 rounded-[20px]" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>

        {/* Title + subtitle */}
        <Skeleton className="h-7 w-[70%] rounded-full mx-auto" />
        <Skeleton className="h-4 w-[85%] rounded-full mx-auto mt-3" />

        {/* Form */}
        <div className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-12 w-full rounded-[12px]" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-12 w-full rounded-[12px]" />
          </div>
          <Skeleton className="h-12 w-full rounded-[14px] mt-2" />
        </div>

        {/* Footer link */}
        <Skeleton className="h-4 w-[60%] rounded-full mx-auto mt-8" />
      </div>
    </main>
  );
}
