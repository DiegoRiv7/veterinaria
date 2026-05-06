import { PageContainer } from "@/components/ui/page";
import { ClientShellSkeleton } from "@/components/client/ClientShellSkeleton";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <ClientShellSkeleton>
      <PageContainer>
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-[50%] rounded-full" />
          <Skeleton className="h-4 w-[35%] rounded-full mt-3" />
        </div>

        {/* 5-step bar */}
        <div className="flex items-center gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-2 flex-1 rounded-full" />
          ))}
        </div>

        {/* Step description */}
        <Skeleton className="h-5 w-[60%] rounded-full mb-2" />
        <Skeleton className="h-3.5 w-[80%] rounded-full mb-6" />

        {/* 4 option cards */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} rows={2} />
          ))}
        </div>

        {/* Bottom action */}
        <Skeleton className="h-12 w-full rounded-[14px] mt-8" />
      </PageContainer>
      
    </ClientShellSkeleton>
  );
}
