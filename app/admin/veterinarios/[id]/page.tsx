import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { VetDetailClient } from "@/components/admin/VetDetailClient";

export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export default async function VetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const { id } = await params;

  const vet = await prisma.veterinarian.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      workingHours: { orderBy: { dayOfWeek: "asc" } },
      appointments: {
        select: {
          status: true,
          priceEstimate: true,
          scheduledAt: true,
          service: { select: { name: true } },
        },
      },
      _count: { select: { appointments: true } },
    },
  });
  if (!vet) notFound();

  const monthStart = startOfMonth();
  const monthEnd = addMonths(monthStart, 1);

  const monthAppts = vet.appointments.filter(
    (a) => a.scheduledAt >= monthStart && a.scheduledAt < monthEnd
  );
  const monthCompleted = monthAppts.filter((a) => a.status === "COMPLETED");
  const monthRevenue = monthCompleted.reduce(
    (acc, a) => acc + a.priceEstimate,
    0
  );
  const totalCompleted = vet.appointments.filter(
    (a) => a.status === "COMPLETED"
  );
  const totalRevenue = totalCompleted.reduce(
    (acc, a) => acc + a.priceEstimate,
    0
  );

  // Top service for this vet (all-time)
  const svcCounts = new Map<string, number>();
  for (const a of vet.appointments) {
    svcCounts.set(a.service.name, (svcCounts.get(a.service.name) ?? 0) + 1);
  }
  const topService = [...svcCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0];

  // Pre-build working-hours rows for all 7 days (so the editor can show empty days too)
  const byDay = new Map(vet.workingHours.map((w) => [w.dayOfWeek, w]));
  const workingHours = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const w = byDay.get(d);
    return {
      dayOfWeek: d,
      isWorking: w?.isWorking ?? true,
      startMinutes: w?.startMinutes ?? 540,
      endMinutes: w?.endMinutes ?? 1080,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/veterinarios"
        className="inline-flex items-center gap-1 text-[13px] font-extrabold no-underline self-start"
        style={{ color: "var(--vet-green)" }}
      >
        <ChevronLeft size={14} /> Veterinarios
      </Link>

      <VetDetailClient
        vet={{
          id: vet.id,
          name: vet.user.name,
          email: vet.user.email,
          phone: vet.user.phone,
          bio: vet.bio,
          photoUrl: vet.photoUrl,
        }}
        stats={{
          totalAppts: vet._count.appointments,
          totalCompleted: totalCompleted.length,
          totalRevenue,
          monthAppts: monthAppts.length,
          monthCompleted: monthCompleted.length,
          monthRevenue,
          topService: topService
            ? { name: topService[0], count: topService[1] }
            : null,
        }}
        workingHours={workingHours}
      />
    </div>
  );
}
