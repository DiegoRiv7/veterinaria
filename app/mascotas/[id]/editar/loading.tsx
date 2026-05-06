import { PageContainer } from "@/components/ui/page";
import { ClientShellSkeleton } from "@/components/client/ClientShellSkeleton";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <ClientShellSkeleton>
      <PageContainer>
        <Skeleton className="h-4 w-20 mb-4" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <SkeletonCard className="h-[600px]" />
      </PageContainer>
      
    </ClientShellSkeleton>
  );
}
