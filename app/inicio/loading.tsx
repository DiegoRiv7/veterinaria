import { PageContainer } from "@/components/ui/page";
import { ClientShellSkeleton } from "@/components/client/ClientShellSkeleton";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";

export default function Loading() {
  return (
    <ClientShellSkeleton>
      <PageContainer>
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-[55%] rounded-full" />
          <Skeleton className="h-4 w-[40%] rounded-full mt-3" />
        </div>

        {/* Agendar CTA bar */}
        <Skeleton className="h-[88px] w-full rounded-[20px] mb-6 bg-[var(--color-brand-soft)]" />

        {/* Section title */}
        <Skeleton className="h-3 w-24 rounded-full mb-3 mt-7" />

        {/* 3 row cards */}
        <div className="flex flex-col gap-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>

        {/* Footer / history hint */}
        <Skeleton className="h-3 w-20 rounded-full mt-7 mb-3" />
        <SkeletonRow />
      </PageContainer>
    </ClientShellSkeleton>
  );
}
