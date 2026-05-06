import { PageContainer } from "@/components/ui/page";
import { ClientShellSkeleton } from "@/components/client/ClientShellSkeleton";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";

export default function Loading() {
  return (
    <ClientShellSkeleton>
      <PageContainer>
        {/* Header with right button */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-8 w-[60%] rounded-full" />
            <Skeleton className="h-4 w-[45%] rounded-full mt-3" />
          </div>
          <Skeleton className="h-10 w-28 rounded-[12px] shrink-0" />
        </div>

        {/* 3 pet card rows */}
        <div className="grid gap-3">
          <SkeletonRow iconSize={56} />
          <SkeletonRow iconSize={56} />
          <SkeletonRow iconSize={56} />
        </div>
      </PageContainer>
      
    </ClientShellSkeleton>
  );
}
