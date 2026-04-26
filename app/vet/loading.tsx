import { AppShell, PageContainer } from "@/components/ui/page";
import { VetTabBar } from "@/components/VetTabBar";
import { Skeleton, SkeletonRow, SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <AppShell>
      <PageContainer>
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-4 w-[55%] rounded-full mt-3" />
        </div>

        {/* 3 appt rows */}
        <div className="flex flex-col gap-3">
          <SkeletonRow iconSize={44} />
          <SkeletonRow iconSize={44} />
          <SkeletonRow iconSize={44} />
        </div>

        {/* Resumen section */}
        <Skeleton className="h-3 w-20 rounded-full mt-7 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </div>
      </PageContainer>
      <VetTabBar />
    </AppShell>
  );
}
