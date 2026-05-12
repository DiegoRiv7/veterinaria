import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { TodayViewClient } from "@/components/vet/TodayViewClient";
import { NewAppointmentButton } from "@/components/vet/NewAppointmentButton";

export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfNextDay(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

type FilterValue = "todas" | "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
const ALLOWED: FilterValue[] = ["todas", "SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export default async function VetTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const { status } = await searchParams;
  const initialFilter: FilterValue = ALLOWED.includes(status as FilterValue)
    ? (status as FilterValue)
    : "todas";

  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });
  const vetFilter = vetProfile ? { vetId: vetProfile.id } : {};

  const [appts, clients, services] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...vetFilter, scheduledAt: { gte: startOfDay(), lt: startOfNextDay() } },
      include: { pet: true, service: true, client: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true, name: true, phone: true, pets: { select: { id: true, name: true, species: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const headerDate = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  // Strip Date objects to plain strings for the client component
  const serializable = appts.map((a) => ({
    id: a.id,
    scheduledAt: a.scheduledAt.toISOString(),
    durationMinutes: a.durationMinutes,
    status: a.status,
    pet: { name: a.pet.name, species: a.pet.species },
    client: { name: a.client.name },
    service: { name: a.service.name, category: a.service.category },
  }));

  const clientOptions = clients.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    pets: c.pets,
  }));
  const serviceOptions = services.map((s) => ({
    id: s.id,
    name: s.name,
    basePrice: s.basePrice,
    durationMinutes: s.durationMinutes,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2
            className="text-[22px] font-black tracking-tight"
            style={{ color: "var(--vet-text-1)" }}
          >
            Citas de Hoy
          </h2>
          <div className="text-[13px] font-semibold capitalize" style={{ color: "var(--vet-text-3)" }}>
            {headerDate} · {appts.length} {appts.length === 1 ? "cita programada" : "citas programadas"}
          </div>
        </div>
        <NewAppointmentButton clients={clientOptions} services={serviceOptions} />
      </div>

      <TodayViewClient
        appts={serializable}
        headerDate={headerDate}
        initialFilter={initialFilter}
        hideHeader
      />
    </div>
  );
}
