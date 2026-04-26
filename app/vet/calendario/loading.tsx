import { AppShell, PageContainer } from "@/components/ui/page";
import { VetTabBar } from "@/components/VetTabBar";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";

export default function Loading() {
  return (
    <AppShell>
      <PageContainer>
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-44 rounded-full" />
          <Skeleton className="h-4 w-32 rounded-full mt-3" />
        </div>

        {/* Day nav */}
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-10 w-10 rounded-[10px]" />
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-3 w-32 rounded-full" />
          </div>
          <Skeleton className="h-10 w-10 rounded-[10px]" />
        </div>

        {/* Day strip */}
        <div className="flex gap-2 overflow-hidden pb-2 mb-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-14 rounded-[12px] shrink-0" />
          ))}
        </div>

        {/* 3 rows */}
        <div className="flex flex-col gap-3">
          <SkeletonRow iconSize={40} />
          <SkeletonRow iconSize={40} />
          <SkeletonRow iconSize={40} />
        </div>
      </PageContainer>
      <VetTabBar />
    </AppShell>
  );
}
