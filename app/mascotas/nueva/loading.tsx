import { PageContainer } from "@/components/ui/page";
import { ClientShellSkeleton } from "@/components/client/ClientShellSkeleton";
import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <ClientShellSkeleton>
      <PageContainer>
        {/* Back link */}
        <Skeleton className="h-4 w-28 rounded-full mb-3" />

        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-[60%] rounded-full" />
          <Skeleton className="h-4 w-[50%] rounded-full mt-3" />
        </div>

        {/* Tall form skeleton */}
        <div className="bg-[var(--color-surface)]/95 backdrop-blur-sm rounded-[18px] shadow-[var(--shadow-soft-sm)] border border-[var(--color-border)] p-5 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-12 w-full rounded-[12px]" />
          </div>
          {/* Species + Breed */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-14 rounded-full" />
              <Skeleton className="h-12 w-full rounded-[12px]" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-12 rounded-full" />
              <Skeleton className="h-12 w-full rounded-[12px]" />
            </div>
          </div>
          {/* Birth + Sex */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-12 w-full rounded-[12px]" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-10 rounded-full" />
              <Skeleton className="h-12 w-full rounded-[12px]" />
            </div>
          </div>
          {/* Weight + Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-12 rounded-full" />
              <Skeleton className="h-12 w-full rounded-[12px]" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-12 rounded-full" />
              <Skeleton className="h-12 w-full rounded-[12px]" />
            </div>
          </div>
          {/* Microchip */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-12 w-full rounded-[12px]" />
          </div>
          {/* Sterilized toggle */}
          <Skeleton className="h-12 w-full rounded-[12px]" />
          {/* Notes */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-24 w-full rounded-[12px]" />
          </div>
          {/* Submit */}
          <Skeleton className="h-12 w-full rounded-[14px]" />
        </div>
      </PageContainer>
      
    </ClientShellSkeleton>
  );
}
