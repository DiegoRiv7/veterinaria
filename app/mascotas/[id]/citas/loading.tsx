import { AppShell, PageContainer } from "@/components/ui/page";
import { ClientTabBar } from "@/components/ClientTabBar";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";

export default function Loading() {
  return (
    <AppShell>
      <PageContainer>
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-44 mb-6" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </PageContainer>
      <ClientTabBar />
    </AppShell>
  );
}
