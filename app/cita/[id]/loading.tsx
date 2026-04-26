import { AppShell, PageContainer } from "@/components/ui/page";
import { ClientTabBar } from "@/components/ClientTabBar";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <AppShell>
      <PageContainer>
        {/* Back link */}
        <Skeleton className="h-4 w-20 rounded-full mb-3" />

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-8 w-[65%] rounded-full" />
            <Skeleton className="h-4 w-[80%] rounded-full mt-3" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full shrink-0" />
        </div>

        {/* Detail list */}
        <div className="bg-[var(--color-surface)]/95 backdrop-blur-sm rounded-[18px] shadow-[var(--shadow-soft-sm)] border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-divider)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center gap-3">
              {i === 0 && (
                <Skeleton className="h-11 w-11 rounded-[14px] shrink-0" />
              )}
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-4 w-40 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* 3 detail cards */}
        <Skeleton className="h-3 w-40 rounded-full mt-7 mb-3" />
        <div className="flex flex-col gap-3">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={3} />
          <SkeletonCard rows={3} />
        </div>
      </PageContainer>
      <ClientTabBar />
    </AppShell>
  );
}
