import { AppShell, PageContainer } from "@/components/ui/page";
import { AdminTabBar } from "@/components/AdminTabBar";
import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <AppShell>
      <PageContainer>
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-4 w-[60%] rounded-full mt-3" />
        </div>

        <Skeleton className="h-3 w-24 rounded-full mb-3 mt-2" />

        {/* 3 service cards */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--color-surface)]/95 backdrop-blur-sm rounded-[18px] shadow-[var(--shadow-soft-sm)] border border-[var(--color-border)] p-5 flex flex-col gap-3"
            >
              {/* Name */}
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-16 rounded-full" />
                <Skeleton className="h-12 w-full rounded-[12px]" />
              </div>
              {/* Description */}
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-20 w-full rounded-[12px]" />
              </div>
              {/* Price + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-20 rounded-full" />
                  <Skeleton className="h-12 w-full rounded-[12px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-16 rounded-full" />
                  <Skeleton className="h-12 w-full rounded-[12px]" />
                </div>
              </div>
              {/* Active toggle */}
              <Skeleton className="h-12 w-full rounded-[12px]" />
              {/* Save button */}
              <Skeleton className="h-10 w-28 rounded-[12px]" />
            </div>
          ))}
        </div>
      </PageContainer>
      <AdminTabBar />
    </AppShell>
  );
}
