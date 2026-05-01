import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { StatCard } from "@/components/vet/StatCard";
import { AppointmentRow } from "@/components/vet/AppointmentRow";
import { VetIcon } from "@/components/vet/VetIcon";

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
function startOfNextMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export default async function VetDashboardPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });
  const today = startOfDay();
  const tomorrow = startOfNextDay();
  const monthStart = startOfMonth();
  const monthEnd = startOfNextMonth();

  const vetFilter = vetProfile ? { vetId: vetProfile.id } : {};

  const [todayAppts, upcoming, monthAppts, totalPets] = await Promise.all([
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
      take: 5,
    }),
    prisma.appointment.findMany({
      where: { ...vetFilter, scheduledAt: { gte: monthStart, lt: monthEnd } },
      include: { service: { select: { name: true } } },
    }),
    vetProfile
      ? prisma.appointment
          .findMany({ where: { vetId: vetProfile.id }, distinct: ["petId"], select: { petId: true } })
          .then((rows) => rows.length)
      : prisma.pet.count(),
  ]);

  const completedToday = todayAppts.filter((a) => a.status === "COMPLETED").length;
  const scheduledToday = todayAppts.filter((a) => a.status === "SCHEDULED").length;

  // Group monthly appointments by service category
  const monthBuckets = { Consultas: 0, Vacunaciones: 0, Cirugías: 0 };
  for (const a of monthAppts) {
    const n = a.service.name.toLowerCase();
    if (n.includes("vacun")) monthBuckets.Vacunaciones++;
    else if (n.includes("operac") || n.includes("cirug") || n.includes("ester"))
      monthBuckets["Cirugías"]++;
    else monthBuckets.Consultas++;
  }
  const monthTotal = monthAppts.length || 1;
  const monthRows = [
    { label: "Consultas", val: monthBuckets.Consultas, pct: Math.round((monthBuckets.Consultas / monthTotal) * 100) },
    { label: "Cirugías", val: monthBuckets["Cirugías"], pct: Math.round((monthBuckets["Cirugías"] / monthTotal) * 100) },
    { label: "Vacunaciones", val: monthBuckets.Vacunaciones, pct: Math.round((monthBuckets.Vacunaciones / monthTotal) * 100) },
  ];

  // Visual-only stock placeholders (Inventario module not implemented yet)
  const stockDemo = [
    { name: "Vacuna Antirrábica", current: 3, min: 10, unit: "dosis" },
    { name: "Amoxicilina 500mg", current: 8, min: 20, unit: "comp" },
    { name: "Isoflurano", current: 1, min: 3, unit: "frascos" },
  ];

  const todayStr = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);

  const firstName = session.name.split(" ").find((s) => !/^Dr/i.test(s)) ?? session.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[13px] font-bold capitalize" style={{ color: "var(--vet-text-3)" }}>
            {todayStr}
          </div>
          <h1 className="text-[26px] font-black tracking-tight mt-1" style={{ color: "var(--vet-text-1)" }}>
            Buenos días, {firstName} 👋
          </h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Citas Hoy" value={todayAppts.length} sub={`${scheduledToday} pendientes`} icon="calendar" color="var(--vet-green)" />
        <StatCard label="Completadas" value={completedToday} sub="del día" icon="today" color="var(--vet-blue)" />
        <StatCard label="En Espera" value={scheduledToday} sub="por atender" icon="patients" color="var(--vet-amber)" />
        <StatCard label="Pacientes" value={totalPets} sub="atendidos" icon="paw" color="var(--vet-violet)" />
      </div>

      {/* Two columns */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        {/* Upcoming appointments */}
        <div
          className="overflow-hidden border"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            borderRadius: 22,
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderBottomColor: "var(--vet-border)" }}
          >
            <span className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
              Próximas citas
            </span>
            <Link href="/vet/hoy" className="text-[12px] font-bold no-underline" style={{ color: "var(--vet-green)" }}>
              Ver todas →
            </Link>
          </div>
          <div className="p-3 flex flex-col gap-2 max-h-[420px] overflow-y-auto">
            {upcoming.length === 0 ? (
              <div className="py-10 text-center text-[14px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                Sin citas próximas
              </div>
            ) : (
              upcoming.map((a) => <AppointmentRow key={a.id} appt={a} compact />)
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          {/* Inventory alerts (visual-only demo) */}
          <div
            className="overflow-hidden border"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              borderRadius: 22,
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
          </div>

          {/* Monthly summary */}
          <div
            className="border p-4"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              borderRadius: 22,
            }}
          >
            <div className="font-extrabold text-[14px] mb-3" style={{ color: "var(--vet-text-1)" }}>
              Resumen del Mes
            </div>
            {monthRows.map((r) => (
              <div key={r.label} className="mb-2.5 last:mb-0">
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                    {r.label}
                  </span>
                  <span className="vet-mono text-[12px] font-extrabold" style={{ color: "var(--vet-text-1)" }}>
                    {r.val}
                  </span>
                </div>
                <div className="h-[5px] rounded-full" style={{ background: "var(--vet-bg-hover)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.pct}%`, background: "var(--vet-green)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
