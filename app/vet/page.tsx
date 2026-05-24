import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { StatCard } from "@/components/vet/StatCard";
import { AppointmentRow } from "@/components/vet/AppointmentRow";
import { VetIcon } from "@/components/vet/VetIcon";
import { MonthlySummaryCard } from "@/components/vet/MonthlySummaryCard";

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

export default async function VetDashboardPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });
  const today = startOfDay();
  const tomorrow = startOfNextDay();
  const monthStart = startOfMonth();
  const monthEnd = addMonths(monthStart, 1);
  // 12-month window for the summary modal
  const last12Start = addMonths(monthStart, -11);

  const vetFilter = vetProfile ? { vetId: vetProfile.id } : {};

  const [todayAppts, upcoming, last12Detail, vetMessages] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...vetFilter, scheduledAt: { gte: today, lt: tomorrow } },
      include: { pet: true, service: true, client: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        ...vetFilter,
        status: "SCHEDULED",
        scheduledAt: { gte: new Date() },
      },
      include: { pet: true, service: true, client: true },
      orderBy: { scheduledAt: "asc" },
      take: 12,
    }),
    prisma.appointment.findMany({
      where: { ...vetFilter, scheduledAt: { gte: last12Start, lt: monthEnd } },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        priceEstimate: true,
        durationMinutes: true,
        pet: { select: { name: true, species: true } },
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { scheduledAt: "desc" },
    }),
    prisma.message.findMany({
      where: { senderId: session.userId, createdAt: { gte: last12Start } },
      select: { createdAt: true },
    }),
  ]);

  const completedToday = todayAppts.filter((a) => a.status === "COMPLETED").length;
  const scheduledToday = todayAppts.filter((a) => a.status === "SCHEDULED").length;
  const cancelledToday = todayAppts.filter(
    (a) => a.status === "CANCELLED" || a.status === "NO_SHOW"
  ).length;

  // Current month buckets for the trigger card display
  const thisMonth = last12Detail.filter(
    (a) => a.scheduledAt >= monthStart && a.scheduledAt < monthEnd
  );
  const monthBuckets = { consultas: 0, vacunaciones: 0, cirugias: 0, otros: 0 };
  function categoryFor(name: string): "consultas" | "cirugias" | "vacunaciones" | "otros" {
    const n = name.toLowerCase();
    if (n.includes("vacun")) return "vacunaciones";
    if (n.includes("operac") || n.includes("cirug") || n.includes("ester")) return "cirugias";
    if (
      n.includes("desparasit") ||
      n.includes("urgenc") ||
      n.includes("estét") ||
      n.includes("estet") ||
      n.includes("baño") ||
      n.includes("bano")
    )
      return "otros";
    return "consultas";
  }
  for (const a of thisMonth) {
    monthBuckets[categoryFor(a.service.name)]++;
  }
  const monthTotal = thisMonth.length;
  const monthRows = [
    { label: "Consultas", val: monthBuckets.consultas, pct: monthTotal ? Math.round((monthBuckets.consultas / monthTotal) * 100) : 0 },
    { label: "Cirugías", val: monthBuckets.cirugias, pct: monthTotal ? Math.round((monthBuckets.cirugias / monthTotal) * 100) : 0 },
    { label: "Vacunaciones", val: monthBuckets.vacunaciones, pct: monthTotal ? Math.round((monthBuckets.vacunaciones / monthTotal) * 100) : 0 },
  ];

  // Serialize the detailed appointments for the client modal
  const appointmentsForModal = last12Detail.map((a) => ({
    id: a.id,
    date: a.scheduledAt.toISOString(),
    status: a.status,
    priceEstimate: a.priceEstimate,
    durationMinutes: a.durationMinutes,
    petName: a.pet.name,
    petSpecies: a.pet.species,
    clientName: a.client.name,
    serviceName: a.service.name,
  }));

  const stockDemo = [
    { name: "Vacuna Antirrábica", current: 3, min: 10, unit: "dosis" },
    { name: "Amoxicilina 500mg", current: 8, min: 20, unit: "comp" },
    { name: "Isoflurano", current: 1, min: 3, unit: "frascos" },
  ];

  const upcomingClinical = upcoming
    .filter((a) => a.service.category !== "AESTHETIC")
    .slice(0, 6);
  const upcomingAesthetic = upcoming
    .filter((a) => a.service.category === "AESTHETIC")
    .slice(0, 6);

  const upcomingSections = [
    {
      title: "Veterinaria",
      href: "/vet/calendario?cat=clinical",
      icon: "🩺",
      count: upcomingClinical.length,
      color: "var(--vet-green)",
      items: upcomingClinical,
    },
    {
      title: "Estética",
      href: "/vet/calendario?cat=aesthetic",
      icon: "✂️",
      count: upcomingAesthetic.length,
      color: "var(--vet-blue-dim)",
      items: upcomingAesthetic,
    },
  ];

  const firstName =
    session.name.split(" ").find((s) => !/^Dr/i.test(s)) ?? session.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <h1
        className="text-[26px] font-black tracking-tight"
        style={{ color: "var(--vet-text-1)" }}
      >
        Buenos días, {firstName} 👋
      </h1>

      {/* Stats — all clickable */}
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Citas Hoy"
          value={todayAppts.length}
          sub={`${scheduledToday} pendientes`}
          icon="calendar"
          color="var(--vet-green)"
          href="/vet/hoy"
        />
        <StatCard
          label="Atendidas"
          value={completedToday}
          sub="del día"
          icon="today"
          color="var(--vet-blue)"
          href="/vet/hoy?status=COMPLETED"
        />
        <StatCard
          label="En Espera"
          value={scheduledToday}
          sub="por atender"
          icon="patients"
          color="var(--vet-amber)"
          href="/vet/hoy?status=SCHEDULED"
        />
        <StatCard
          label="Canceladas"
          value={cancelledToday}
          sub="del día"
          icon="warning"
          color="var(--vet-red)"
          href="/vet/hoy?status=CANCELLED"
        />
      </div>

      {/* Two columns — full-height stretch only on desktop */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1.4fr_1fr] lg:flex-1 lg:min-h-0">
        {/* Upcoming appointments */}
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
            <span className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
              Próximas citas
            </span>
            <Link
              href="/vet/hoy"
              className="text-[12px] font-bold no-underline"
              style={{ color: "var(--vet-green)" }}
            >
              Ver todas →
            </Link>
          </div>
          <div className="p-3 lg:flex-1 lg:overflow-y-auto">
            {upcoming.length === 0 ? (
              <div
                className="flex-1 flex items-center justify-center py-10 text-center text-[14px] font-semibold"
                style={{ color: "var(--vet-text-3)" }}
              >
                Sin citas próximas
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {upcomingSections.map((section) => (
                  <section
                    key={section.title}
                    className="border p-3 flex flex-col gap-2 min-w-0"
                    style={{
                      background: "var(--vet-bg-mid)",
                      borderColor: "var(--vet-border)",
                      borderRadius: 16,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[16px]" aria-hidden>
                        {section.icon}
                      </span>
                      <Link
                        href={section.href}
                        className="font-extrabold text-[13px] no-underline truncate"
                        style={{ color: section.color }}
                      >
                        {section.title}
                      </Link>
                      <span
                        className="ml-auto vet-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                        style={{
                          background: `color-mix(in oklab, ${section.color} 16%, transparent)`,
                          color: section.color,
                        }}
                      >
                        {section.count}
                      </span>
                    </div>
                    {section.items.length === 0 ? (
                      <div
                        className="py-8 text-center text-[12px] font-bold"
                        style={{ color: "var(--vet-text-3)" }}
                      >
                        Sin citas de {section.title.toLowerCase()}
                      </div>
                    ) : (
                      section.items.map((a) => (
                        <AppointmentRow key={a.id} appt={a} compact />
                      ))
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5 lg:min-h-0">
          {/* Inventory alerts (visual-only demo, clickable) */}
          <Link
            href="/vet/inventario"
            className="overflow-hidden border no-underline transition-all hover:[border-color:var(--vet-amber)]"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              borderRadius: 22,
              color: "var(--vet-text-1)",
            }}
          >
            <div
              className="px-4 py-3.5 border-b flex items-center gap-2"
              style={{ borderBottomColor: "var(--vet-border)" }}
            >
              <VetIcon name="warning" size={16} color="var(--vet-amber)" />
              <span className="font-extrabold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
                Alertas de Inventario
              </span>
              <span
                className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: "var(--vet-amber-glow)", color: "var(--vet-amber)" }}
              >
                Demo
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex flex-col gap-2">
              {stockDemo.map((item) => {
                const pct = (item.current / item.min) * 100;
                return (
                  <div key={item.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[12px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                        {item.name}
                      </span>
                      <span className="vet-mono text-[11px] font-extrabold" style={{ color: "var(--vet-red)" }}>
                        {item.current}/{item.min} {item.unit}
                      </span>
                    </div>
                    <div className="h-[5px] rounded-full" style={{ background: "var(--vet-bg-hover)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: pct < 40 ? "var(--vet-red)" : "var(--vet-amber)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Link>

          {/* Resumen — opens animated modal on click */}
          <MonthlySummaryCard
            monthRows={monthRows}
            appointments={appointmentsForModal}
            messages={vetMessages.map((m) => ({ date: m.createdAt.toISOString() }))}
            currentMonth={{ year: monthStart.getFullYear(), month: monthStart.getMonth() }}
            vetName={session.name}
          />
        </div>
      </div>
    </div>
  );
}
