import { AppShell, PageContainer } from "@/components/ui/page";
import { AdminTabBar } from "@/components/AdminTabBar";
import { Skeleton, SkeletonCard, SkeletonRow } from "@/components/Skeleton";

export default function Loading() {
  return (
    <AppShell>
      <PageContainer>
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-[70%] rounded-full" />
          <Skeleton className="h-4 w-[45%] rounded-full mt-3" />
        </div>

        {/* 2-col stats */}
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </div>

        {/* Section title */}
        <Skeleton className="h-3 w-28 rounded-full mt-7 mb-3" />

        {/* 5 tiles */}
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} iconSize={44} showRight={false} />
          ))}
        </div>
      </PageContainer>
      <AdminTabBar />
    </AppShell>
  );
}
