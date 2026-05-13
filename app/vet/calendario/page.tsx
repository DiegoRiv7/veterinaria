import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppointmentRow } from "@/components/vet/AppointmentRow";
import { VetIcon } from "@/components/vet/VetIcon";
import { NewAppointmentButton } from "@/components/vet/NewAppointmentButton";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDay(raw: string | undefined): Date {
  if (!raw) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(raw + "T00:00:00");
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }
  return d;
}

type CatFilter = "clinical" | "aesthetic" | "all";

function parseCat(raw: string | undefined): CatFilter {
  if (raw === "aesthetic" || raw === "all") return raw;
  return "clinical";
}

export default async function VetCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; cat?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const { day: dayParam, cat: catParam } = await searchParams;
  const selectedDay = parseDay(dayParam);
  const catFilter = parseCat(catParam);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = selectedDay.getFullYear();
  const month = selectedDay.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const firstDayOfWeek = monthStart.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });
  const vetFilter = vetProfile ? { vetId: vetProfile.id } : {};

  // Apply category filter via service.category
  const categoryWhere =
    catFilter === "all"
      ? {}
      : {
          service: {
            category:
              catFilter === "aesthetic"
                ? ("AESTHETIC" as const)
                : ("CLINICAL" as const),
          },
        };

  const [monthAppts, dayAppts, clients, services] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        ...vetFilter,
        ...categoryWhere,
        scheduledAt: { gte: monthStart, lt: monthEnd },
      },
      select: { scheduledAt: true },
    }),
    (() => {
      const selectedNext = new Date(selectedDay);
      selectedNext.setDate(selectedNext.getDate() + 1);
      return prisma.appointment.findMany({
        where: {
          ...vetFilter,
          ...categoryWhere,
          scheduledAt: { gte: selectedDay, lt: selectedNext },
        },
        include: { pet: true, service: true, client: true },
        orderBy: { scheduledAt: "asc" },
      });
    })(),
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

  // Build per-day count for the calendar dots
  const countByDay = new Map<string, number>();
  for (const a of monthAppts) {
    const key = toISODate(a.scheduledAt);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function dayHref(day: string) {
    const params = new URLSearchParams({ day });
    if (catFilter !== "clinical") params.set("cat", catFilter);
    return `/vet/calendario?${params.toString()}`;
  }
  function catHref(cat: CatFilter) {
    const params = new URLSearchParams();
    if (dayParam) params.set("day", dayParam);
    if (cat !== "clinical") params.set("cat", cat);
    const qs = params.toString();
    return qs ? `/vet/calendario?${qs}` : "/vet/calendario";
  }

  const CAT_OPTIONS: {
    value: CatFilter;
    label: string;
    emoji: string;
    color: string;
  }[] = [
    { value: "clinical", label: "Clínicos", emoji: "🩺", color: "var(--vet-green)" },
    { value: "aesthetic", label: "Estéticos", emoji: "✂️", color: "var(--vet-blue-dim)" },
    { value: "all", label: "Todos", emoji: "🐾", color: "var(--vet-text-1)" },
  ];

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1.2fr_1fr] lg:items-start">
      {/* Calendar */}
      <div
        className="border p-4 sm:p-6 flex flex-col gap-5 self-start"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 22,
        }}
      >
          <div className="flex items-center justify-between">
            <Link
              href={dayHref(toISODate(prevMonth))}
              className="p-1.5 rounded-lg"
              style={{ color: "var(--vet-text-2)" }}
              aria-label="Mes anterior"
            >
              <VetIcon name="chevronLeft" size={18} color="var(--vet-text-2)" />
            </Link>
            <div className="font-extrabold text-[17px]" style={{ color: "var(--vet-text-1)" }}>
              {MONTH_NAMES[month]} {year}
            </div>
            <Link
              href={dayHref(toISODate(nextMonth))}
              className="p-1.5 rounded-lg"
              style={{ color: "var(--vet-text-2)" }}
              aria-label="Mes siguiente"
            >
              <VetIcon name="chevronRight" size={18} color="var(--vet-text-2)" />
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES_SHORT.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-extrabold pb-1"
                style={{ color: "var(--vet-text-3)" }}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} />;
              const date = new Date(year, month, d);
              const iso = toISODate(date);
              const count = countByDay.get(iso) ?? 0;
              const isToday = date.getTime() === today.getTime();
              const isSel =
                selectedDay.getDate() === d &&
                selectedDay.getMonth() === month &&
                selectedDay.getFullYear() === year;
              return (
                <Link
                  key={iso}
                  href={dayHref(iso)}
                  className="flex flex-col items-center justify-center py-1.5 px-1 rounded-[10px] gap-1 h-[48px] sm:h-[52px]"
                  style={{
                    border: isToday ? "2px solid var(--vet-green)" : "2px solid transparent",
                    background: isSel ? "var(--vet-green-glow)" : "transparent",
                  }}
                >
                  <span
                    className="text-[13px]"
                    style={{
                      fontWeight: isSel || isToday ? 800 : 600,
                      color: isSel || isToday ? "var(--vet-green)" : "var(--vet-text-1)",
                    }}
                  >
                    {d}
                  </span>
                  {count > 0 && (
                    <div className="flex gap-[2px]">
                      {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                        <span
                          key={j}
                          className="w-1 h-1 rounded-full"
                          style={{ background: "var(--vet-green)", opacity: 0.7 }}
                        />
                      ))}
                      {count > 3 && (
                        <span
                          className="w-1 h-1 rounded-full"
                          style={{ background: "var(--vet-text-3)" }}
                        />
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
      </div>

      {/* Right column: selected day appointments */}
      <div
        className="border overflow-hidden flex flex-col self-start max-h-[calc(100dvh-160px)]"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 22,
        }}
      >
        <div
          className="px-5 pt-4 pb-3 border-b flex flex-col gap-3"
          style={{ borderBottomColor: "var(--vet-border)" }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
                {selectedDay.getDate()} de {MONTH_NAMES[selectedDay.getMonth()]}
              </div>
              <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                {dayAppts.length === 0
                  ? "Sin citas"
                  : `${dayAppts.length} ${dayAppts.length === 1 ? "cita" : "citas"}`}
              </div>
            </div>
            <NewAppointmentButton
              clients={clientOptions}
              services={serviceOptions}
              defaultDate={toISODate(selectedDay)}
              label="Agendar"
            />
          </div>
          {/* Category filter chips — local to the day's list */}
          <div className="flex gap-1.5 flex-wrap">
            {CAT_OPTIONS.map((c) => {
              const active = catFilter === c.value;
              return (
                <Link
                  key={c.value}
                  href={catHref(c.value)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-colors border no-underline"
                  style={{
                    borderColor: active ? c.color : "var(--vet-border)",
                    background: active
                      ? `color-mix(in oklab, ${c.color} 14%, transparent)`
                      : "transparent",
                    color: active ? c.color : "var(--vet-text-3)",
                  }}
                >
                  <span>{c.emoji}</span>
                  {c.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2">
          {dayAppts.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-2 py-10"
              style={{ color: "var(--vet-text-3)" }}
            >
              <div className="text-[40px]">📅</div>
              <div className="font-bold text-[14px]">Día libre</div>
              <div className="text-[12px] font-semibold">No hay citas programadas</div>
            </div>
          ) : (
            dayAppts.map((a) => <AppointmentRow key={a.id} appt={a} compact />)
          )}
        </div>
      </div>
    </div>
  );
}
