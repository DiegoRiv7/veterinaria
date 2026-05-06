import { PageContainer } from "@/components/ui/page";
import { ClientShellSkeleton } from "@/components/client/ClientShellSkeleton";
import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <ClientShellSkeleton>
      <PageContainer>
        {/* Back link */}
        <Skeleton className="h-4 w-28 rounded-full mb-3" />

        {/* Big avatar block */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-20 w-20 rounded-[22px] shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <Skeleton className="h-7 w-[55%] rounded-full" />
            <Skeleton className="h-4 w-[70%] rounded-full" />
          </div>
        </div>

        {/* Section title */}
        <Skeleton className="h-3 w-16 rounded-full mb-3 mt-7" />

        {/* 5-row list */}
        <div className="bg-[var(--color-surface)]/95 backdrop-blur-sm rounded-[18px] shadow-[var(--shadow-soft-sm)] border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-divider)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center gap-3">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-full" />
            </div>
          ))}
        </div>

        {/* Edit form skeleton */}
        <Skeleton className="h-3 w-32 rounded-full mb-3 mt-7" />
        <div className="bg-[var(--color-surface)]/95 backdrop-blur-sm rounded-[18px] shadow-[var(--shadow-soft-sm)] border border-[var(--color-border)] p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-12 w-full rounded-[12px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-12 rounded-full" />
              <Skeleton className="h-12 w-full rounded-[12px]" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-14 rounded-full" />
              <Skeleton className="h-12 w-full rounded-[12px]" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-24 w-full rounded-[12px]" />
          </div>
          <Skeleton className="h-12 w-full rounded-[14px]" />
        </div>
      </PageContainer>
      
    </ClientShellSkeleton>
  );
}
