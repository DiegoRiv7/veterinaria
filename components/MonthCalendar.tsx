import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WEEKDAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function MonthCalendar({
  month,
  appointmentsByDay,
  selectedDay = null,
}: {
  month: Date;
  appointmentsByDay: Map<string, number>;
  selectedDay?: Date | null;
}) {
  // First day of month (local)
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  // First cell = the Sunday on/before the first of month
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  // 6 weeks * 7 days = 42 cells
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    cells.push(d);
  }

  const monthLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(firstOfMonth);

  const prevMonth = new Date(firstOfMonth);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(firstOfMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Link href={`/vet/calendario?month=${toISODate(prevMonth)}&view=month`}>
          <button
            aria-label="Mes anterior"
            className="h-10 w-10 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </Link>
        <p className="text-[15px] font-medium capitalize">{monthLabel}</p>
        <Link href={`/vet/calendario?month=${toISODate(nextMonth)}&view=month`}>
          <button
            aria-label="Mes siguiente"
            className="h-10 w-10 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </Link>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_ES.map((w) => (
          <div
            key={w}
            className="text-[11px] uppercase tracking-wide text-center text-[var(--color-muted)] py-1"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const inMonth = d.getMonth() === firstOfMonth.getMonth();
          const isToday = isSameDay(d, today);
          const isSelected = selectedDay ? isSameDay(d, selectedDay) : false;
          const iso = toISODate(d);
          const count = appointmentsByDay.get(iso) ?? 0;

          return (
            <Link
              key={iso}
              href={`/vet/calendario?day=${iso}&view=day`}
              className={cn(
                "relative flex flex-col items-center justify-start gap-1 aspect-square rounded-[10px] border p-1.5 transition",
                "hover:shadow-[var(--shadow-ios-sm)]",
                isSelected
                  ? "bg-[var(--color-brand)] text-white border-transparent"
                  : isToday
                    ? "bg-[var(--color-surface)] border-[var(--color-brand)]"
                    : inMonth
                      ? "bg-[var(--color-surface)] border-[var(--color-border)]"
                      : "bg-transparent border-transparent text-[var(--color-muted)] opacity-60",
              )}
            >
              <span
                className={cn(
                  "text-[13px] font-medium leading-none mt-0.5",
                  isSelected && "text-white",
                  isToday && !isSelected && "text-[var(--color-brand)] font-semibold",
                )}
              >
                {d.getDate()}
              </span>
              {count > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-semibold leading-none rounded-full px-1.5 py-0.5 min-w-[18px] text-center",
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]",
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
