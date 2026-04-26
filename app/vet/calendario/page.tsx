import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VetTabBar } from "@/components/VetTabBar";
import { EmptyState } from "@/components/EmptyState";
import { MonthCalendar } from "@/components/MonthCalendar";
import { SPECIES_EMOJI, formatDate, formatTime, STATUS_LABEL, DAY_LABEL, cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

function parseDay(raw: string | undefined) {
  if (!raw) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function VetCalendar({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; month?: string; view?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const { day: dayParam, month: monthParam, view: viewParam } = await searchParams;
  const view: "day" | "month" = viewParam === "month" ? "month" : "day";
  const day = parseDay(dayParam);

  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });

  // Toggle helper: pick the right query string for each view
  const dayHref = `/vet/calendario?day=${toISODate(day)}&view=day`;
  const monthAnchor = monthParam ? parseDay(monthParam) : day;
  const monthHref = `/vet/calendario?month=${toISODate(
    new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1),
  )}&view=month`;

  const ToggleControl = (
    <div className="inline-flex p-1 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
      <Link
        href={dayHref}
        className={cn(
          "px-4 py-1.5 rounded-[8px] text-[13px] font-medium transition",
          view === "day"
            ? "bg-[var(--color-brand)] text-white"
            : "text-[var(--color-muted)]",
        )}
      >
        Día
      </Link>
      <Link
        href={monthHref}
        className={cn(
          "px-4 py-1.5 rounded-[8px] text-[13px] font-medium transition",
          view === "month"
            ? "bg-[var(--color-brand)] text-white"
            : "text-[var(--color-muted)]",
        )}
      >
        Mes
      </Link>
    </div>
  );

  if (view === "month") {
    const monthBase = monthParam ? parseDay(monthParam) : day;
    const monthStart = new Date(monthBase.getFullYear(), monthBase.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 1);
    monthEnd.setHours(0, 0, 0, 0);

    const where = vetProfile
      ? { vetId: vetProfile.id, scheduledAt: { gte: monthStart, lt: monthEnd } }
      : { scheduledAt: { gte: monthStart, lt: monthEnd } };

    const appts = await prisma.appointment.findMany({
      where,
      select: { scheduledAt: true },
    });

    const appointmentsByDay = new Map<string, number>();
    for (const a of appts) {
      const iso = toISODate(a.scheduledAt);
      appointmentsByDay.set(iso, (appointmentsByDay.get(iso) ?? 0) + 1);
    }

    return (
      <AppShell>
        <PageContainer>
          <PageHeader title="Calendario" subtitle="Vista por mes." />
          {ToggleControl}
          <MonthCalendar
            month={monthStart}
            appointmentsByDay={appointmentsByDay}
            selectedDay={null}
          />
        </PageContainer>
        <VetTabBar />
      </AppShell>
    );
  }

  // Day view (existing behavior)
  const nextDay = addDays(day, 1);

  const where = vetProfile
    ? { vetId: vetProfile.id, scheduledAt: { gte: day, lt: nextDay } }
    : { scheduledAt: { gte: day, lt: nextDay } };

  const appts = await prisma.appointment.findMany({
    where,
    include: { pet: true, service: true, client: true, vet: { include: { user: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  // Week strip (prev 2, current, next 4)
  const strip: Date[] = [];
  for (let i = -2; i <= 4; i++) strip.push(addDays(day, i));

  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Calendario" subtitle="Vista por día." />

        {ToggleControl}

        <div className="flex items-center justify-between mb-3">
          <Link href={`/vet/calendario?day=${toISODate(addDays(day, -1))}&view=day`}>
            <button className="h-10 w-10 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
              <ChevronLeft className="h-5 w-5" />
            </button>
          </Link>
          <div className="text-center">
            <p className="text-[15px] font-medium capitalize">{DAY_LABEL[day.getDay()]}</p>
            <p className="text-[13px] text-[var(--color-muted)] capitalize">{formatDate(day)}</p>
          </div>
          <Link href={`/vet/calendario?day=${toISODate(addDays(day, 1))}&view=day`}>
            <button className="h-10 w-10 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
              <ChevronRight className="h-5 w-5" />
            </button>
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {strip.map((d) => {
            const active = d.toDateString() === day.toDateString();
            return (
              <Link
                key={d.toISOString()}
                href={`/vet/calendario?day=${toISODate(d)}&view=day`}
                className={`flex flex-col items-center shrink-0 w-14 py-2 rounded-[12px] border ${
                  active
                    ? "bg-[var(--color-brand)] text-white border-transparent"
                    : "bg-[var(--color-surface)] border-[var(--color-border)]"
                }`}
              >
                <span className={`text-[11px] uppercase ${active ? "opacity-80" : "text-[var(--color-muted)]"}`}>
                  {d.toLocaleDateString("es-MX", { weekday: "short" })}
                </span>
                <span className="text-[18px] font-semibold">{d.getDate()}</span>
              </Link>
            );
          })}
        </div>

        {appts.length === 0 ? (
          <EmptyState
            emoji="📅"
            title="Sin citas este día"
            description="Mueve la flecha para revisar otro día."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {appts.map((a) => (
              <Link key={a.id} href={`/vet/cita/${a.id}`}>
                <Card className="hover:shadow-[var(--shadow-ios-md)] transition">
                  <CardBody className="flex items-center gap-4">
                    <div className="w-14 text-center">
                      <p className="font-semibold">{formatTime(a.scheduledAt).split(" ")[0]}</p>
                      <p className="text-[11px] text-[var(--color-muted)]">
                        {formatTime(a.scheduledAt).split(" ")[1]}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-[12px] bg-[var(--color-brand-soft)] flex items-center justify-center text-xl">
                      {SPECIES_EMOJI[a.pet.species]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.service.name}</p>
                      <p className="text-[13px] text-[var(--color-muted)] truncate">
                        {a.pet.name} · {a.client.name}
                      </p>
                    </div>
                    <Badge variant={a.status === "COMPLETED" ? "success" : "brand"}>
                      {STATUS_LABEL[a.status]}
                    </Badge>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
      <VetTabBar />
    </AppShell>
  );
}
