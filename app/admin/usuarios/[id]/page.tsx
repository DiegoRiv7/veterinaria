import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { VetDetailClient } from "@/components/admin/VetDetailClient";
import { StaffDetailClient } from "@/components/admin/StaffDetailClient";

export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const { id } = await params;

  // The route's [id] is the User.id. For vets we resolve the related
  // Veterinarian record and forward its fields to VetDetailClient.
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      vetProfile: {
        include: {
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
      },
    },
  });
  if (!user) notFound();
  if (user.role === "CLIENT") redirect("/admin/clientes");

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/usuarios"
        className="inline-flex items-center gap-1 text-[13px] font-extrabold no-underline self-start"
        style={{ color: "var(--vet-green)" }}
      >
        <ChevronLeft size={14} /> Usuarios
      </Link>

      {user.role === "VET" && user.vetProfile ? (
        <VetView vet={user.vetProfile} user={user} />
      ) : (
        <StaffDetailClient
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            photoUrl: user.photoUrl,
            role: user.role as "ADMIN" | "RECEPTIONIST",
            createdAt: user.createdAt.toISOString(),
          }}
          isSelf={user.id === session.userId}
        />
      )}
    </div>
  );
}

type VetWithRelations = {
  id: string;
  bio: string | null;
  photoUrl: string | null;
  workingHours: {
    dayOfWeek: number;
    isWorking: boolean;
    startMinutes: number;
    endMinutes: number;
  }[];
  appointments: {
    status: string;
    priceEstimate: number;
    scheduledAt: Date;
    service: { name: string };
  }[];
  _count: { appointments: number };
};

function VetView({
  vet,
  user,
}: {
  vet: VetWithRelations;
  user: { id: string; name: string; email: string; phone: string };
}) {
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

  const svcCounts = new Map<string, number>();
  for (const a of vet.appointments) {
    svcCounts.set(a.service.name, (svcCounts.get(a.service.name) ?? 0) + 1);
  }
  const topService = [...svcCounts.entries()].sort((a, b) => b[1] - a[1])[0];

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
    <VetDetailClient
      vet={{
        id: vet.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
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
  );
}
