import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { StatCard } from "@/components/vet/StatCard";
import { AppointmentRow } from "@/components/vet/AppointmentRow";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart3,
  Stethoscope,
  Users,
  Clock,
  Tag,
  Heart,
  ChevronRight,
} from "lucide-react";

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
function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export default async function AdminHome() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const today = startOfDay();
  const tomorrow = startOfNextDay();
  const monthStart = startOfMonth();
  const monthEnd = addMonths(monthStart, 1);
  const last30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [
    clientCount,
    petCount,
    vetCount,
    serviceActive,
    todayAppts,
    upcoming,
    monthAppts,
    recentClients,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.pet.count(),
    prisma.veterinarian.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: today, lt: tomorrow } },
      include: {
        pet: { select: { name: true, species: true } },
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
      include: {
        pet: { select: { name: true, species: true } },
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 6,
    }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: monthStart, lt: monthEnd } },
      select: {
        priceEstimate: true,
        status: true,
        vet: { select: { id: true, user: { select: { name: true } } } },
        service: { select: { name: true } },
      },
    }),
    prisma.user.count({
      where: { role: "CLIENT", createdAt: { gte: last30 } },
    }),
  ]);

  const completedToday = todayAppts.filter((a) => a.status === "COMPLETED").length;
  const scheduledTodayCount = todayAppts.filter((a) => a.status === "SCHEDULED").length;
  const cancelledTodayCount = todayAppts.filter(
    (a) => a.status === "CANCELLED" || a.status === "NO_SHOW"
  ).length;

  // Month aggregates
  const monthCompleted = monthAppts.filter((a) => a.status === "COMPLETED");
  const monthRevenue = monthCompleted.reduce(
    (acc, a) => acc + a.priceEstimate,
    0
  );

  // Top vet (by COMPLETED in month)
  const vetCounts = new Map<string, { name: string; count: number }>();
  for (const a of monthCompleted) {
    const cur = vetCounts.get(a.vet.id) ?? { name: a.vet.user.name, count: 0 };
    cur.count++;
    vetCounts.set(a.vet.id, cur);
  }
  const topVet = [...vetCounts.values()].sort((a, b) => b.count - a.count)[0];

  // Top service
  const svcCounts = new Map<string, number>();
  for (const a of monthAppts) {
    svcCounts.set(a.service.name, (svcCounts.get(a.service.name) ?? 0) + 1);
  }
  const topService = [...svcCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const firstName = session.name.split(" ")[0];
  const monthName = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(monthStart);

  const tiles: {
    href: string;
    label: string;
    hint: string;
    icon: typeof BarChart3;
    color: string;
  }[] = [
    {
      href: "/admin/reportes",
      label: "Reportes y estadísticas",
      hint: "KPIs, comparativa de vets, exportar a Excel",
      icon: BarChart3,
      color: "var(--vet-violet)",
    },
    {
      href: "/admin/clientes",
      label: "Clientes",
      hint: `${clientCount} cliente${clientCount === 1 ? "" : "s"} · ${petCount} mascota${petCount === 1 ? "" : "s"}`,
      icon: Heart,
      color: "var(--vet-red)",
    },
    {
      href: "/admin/veterinarios",
      label: "Veterinarios",
      hint: `${vetCount} registrado${vetCount === 1 ? "" : "s"} · crear, editar, agenda`,
      icon: Users,
      color: "var(--vet-green)",
    },
    {
      href: "/admin/servicios",
      label: "Servicios",
      hint: `${serviceActive} activo${serviceActive === 1 ? "" : "s"} · precios y duración`,
      icon: Stethoscope,
      color: "var(--vet-blue)",
    },
    {
      href: "/admin/horario",
      label: "Horario de la clínica",
      hint: "Días, horas y duración de slots",
      icon: Clock,
      color: "var(--vet-amber)",
    },
    {
      href: "/admin/tarifas",
      label: "Tarifas por especie",
      hint: "Multiplicadores sobre el precio base",
      icon: Tag,
      color: "var(--vet-violet)",
    },
  ];

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <div>
        <h1
          className="text-[26px] font-black tracking-tight"
          style={{ color: "var(--vet-text-1)" }}
        >
          Hola, {firstName} 👋
        </h1>
        <p
          className="text-[13px] font-semibold capitalize"
          style={{ color: "var(--vet-text-3)" }}
        >
          {monthName}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Citas Hoy"
          value={todayAppts.length}
          sub={`${scheduledTodayCount} pendientes · ${completedToday} atendidas${cancelledTodayCount ? ` · ${cancelledTodayCount} canceladas` : ""}`}
          icon="calendar"
          color="var(--vet-green)"
          href="/admin/reportes"
        />
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(monthRevenue)}
          sub={`${monthCompleted.length} citas atendidas`}
          icon="today"
          color="var(--vet-blue)"
          href="/admin/reportes"
        />
        <StatCard
          label="Clientes"
          value={clientCount}
          sub={`+${recentClients} este mes · ${petCount} mascotas`}
          icon="patients"
          color="var(--vet-red)"
          href="/admin/clientes"
        />
        <StatCard
          label="Veterinarios"
          value={vetCount}
          sub={`${serviceActive} servicios activos`}
          icon="paw"
          color="var(--vet-violet)"
          href="/admin/veterinarios"
        />
      </div>

      {/* Highlights */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2">
        <Highlight
          label={`Veterinario top de ${monthName.split(" ")[0]}`}
          primary={topVet?.name ?? "Sin datos"}
          secondary={
            topVet
              ? `${topVet.count} cita${topVet.count === 1 ? "" : "s"} atendidas`
              : "Aún no hay citas atendidas este mes"
          }
          color="var(--vet-green)"
        />
        <Highlight
          label="Servicio más solicitado"
          primary={topService?.[0] ?? "Sin datos"}
          secondary={
            topService
              ? `${topService[1]} ${topService[1] === 1 ? "cita" : "citas"} en el mes`
              : "Aún no hay servicios solicitados"
          }
          color="var(--vet-amber)"
        />
      </div>

      {/* Two columns */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1.4fr_1fr] lg:flex-1 lg:min-h-0">
        {/* Próximas citas */}
        <div
          className="border flex flex-col lg:overflow-hidden"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            borderRadius: 22,
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
            style={{ borderBottomColor: "var(--vet-border)" }}
          >
            <span
              className="font-extrabold text-[15px]"
              style={{ color: "var(--vet-text-1)" }}
            >
              Próximas citas
            </span>
            <Link
              href="/admin/reportes"
              className="text-[12px] font-bold no-underline"
              style={{ color: "var(--vet-green)" }}
            >
              Ver reportes →
            </Link>
          </div>
          <div className="p-3 flex flex-col gap-2 lg:flex-1 lg:overflow-y-auto">
            {upcoming.length === 0 ? (
              <div
                className="flex-1 flex items-center justify-center py-10 text-center text-[14px] font-semibold"
                style={{ color: "var(--vet-text-3)" }}
              >
                No hay citas próximas.
              </div>
            ) : (
              upcoming.map((a) => <AppointmentRow key={a.id} appt={a} compact />)
            )}
          </div>
        </div>

        {/* Configuración rápida */}
        <div className="flex flex-col gap-2.5 lg:min-h-0 lg:overflow-y-auto">
          <p
            className="text-[11px] font-extrabold uppercase tracking-[1px] px-1"
            style={{ color: "var(--vet-text-3)" }}
          >
            Configuración
          </p>
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="flex items-center gap-3 px-4 py-3 border transition-all hover:-translate-y-0.5 no-underline"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  borderRadius: 16,
                  color: "var(--vet-text-1)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `color-mix(in oklab, ${t.color} 14%, transparent)`,
                    color: t.color,
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] font-extrabold"
                    style={{ color: "var(--vet-text-1)" }}
                  >
                    {t.label}
                  </p>
                  <p
                    className="text-[12px] font-semibold leading-snug"
                    style={{ color: "var(--vet-text-3)" }}
                  >
                    {t.hint}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className="flex-shrink-0"
                  color="var(--vet-text-3)"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Highlight({
  label,
  primary,
  secondary,
  color,
}: {
  label: string;
  primary: string;
  secondary: string;
  color: string;
}) {
  return (
    <div
      className="border p-5 rounded-[18px] flex items-center gap-3"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: `color-mix(in oklab, ${color} 16%, transparent)` }}
      >
        🏆
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color: "var(--vet-text-3)" }}
        >
          {label}
        </div>
        <div
          className="text-[16px] font-extrabold truncate"
          style={{ color: "var(--vet-text-1)" }}
        >
          {primary}
        </div>
        <div
          className="vet-mono text-[12px] font-bold"
          style={{ color }}
        >
          {secondary}
        </div>
      </div>
    </div>
  );
}
