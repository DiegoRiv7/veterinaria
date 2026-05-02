"use client";

import { useEffect, useMemo, useState } from "react";
import { VetIcon } from "./VetIcon";

type MonthRow = { label: string; val: number; pct: number };

type AppointmentDetail = {
  id: string;
  date: string;
  status: string;
  priceEstimate: number;
  petName: string;
  petSpecies: string;
  serviceName: string;
};

type Props = {
  monthRows: MonthRow[];
  appointments: AppointmentDetail[];
  currentMonth: { year: number; month: number };
  vetName: string;
};

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Category = "consultas" | "cirugias" | "vacunaciones" | "otros";
const CATEGORY_META: { key: Category; label: string; color: string }[] = [
  { key: "consultas", label: "Consultas", color: "var(--vet-green)" },
  { key: "cirugias", label: "Cirugías", color: "var(--vet-blue)" },
  { key: "vacunaciones", label: "Vacunaciones", color: "var(--vet-violet)" },
  { key: "otros", label: "Otros", color: "var(--vet-amber)" },
];

function categoryFor(name: string): Category {
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

type StatusKey = "COMPLETED" | "SCHEDULED" | "CANCELLED" | "NO_SHOW";
const STATUS_LABEL: Record<StatusKey, string> = {
  COMPLETED: "Atendidas",
  SCHEDULED: "Pendientes",
  CANCELLED: "Canceladas",
  NO_SHOW: "No vinieron",
};
const STATUS_COLOR: Record<StatusKey, string> = {
  COMPLETED: "var(--vet-blue)",
  SCHEDULED: "var(--vet-green)",
  CANCELLED: "var(--vet-red)",
  NO_SHOW: "var(--vet-amber)",
};

type Tab = "dia" | "mes";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/* ─── Trigger card ────────────────────────────────────── */

export function MonthlySummaryCard({
  monthRows,
  appointments,
  currentMonth,
  vetName,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left border p-4 transition-all hover:-translate-y-0.5 hover:[border-color:var(--vet-green)] flex-1 flex flex-col cursor-pointer"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 22,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-extrabold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
            Resumen
          </span>
          <span
            className="text-[11px] font-extrabold flex items-center gap-1"
            style={{ color: "var(--vet-green)" }}
          >
            Ver detalle <VetIcon name="chevronRight" size={12} color="var(--vet-green)" />
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-2.5">
          {monthRows.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between mb-1">
                <span className="text-[12px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                  {r.label}
                </span>
                <span
                  className="vet-mono text-[12px] font-extrabold"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  {r.val}
                </span>
              </div>
              <div className="h-[5px] rounded-full" style={{ background: "var(--vet-bg-hover)" }}>
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${r.pct}%`, background: "var(--vet-green)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </button>

      {open && (
        <SummaryModal
          appointments={appointments}
          currentMonth={currentMonth}
          vetName={vetName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ─── Modal ───────────────────────────────────────────── */

function SummaryModal({
  appointments,
  currentMonth,
  vetName,
  onClose,
}: {
  appointments: AppointmentDetail[];
  currentMonth: { year: number; month: number };
  vetName: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("dia");
  const [closing, setClosing] = useState(false);

  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();
  const [dayStr, setDayStr] = useState(todayStr);
  const [monthKey, setMonthKey] = useState(`${currentMonth.year}-${currentMonth.month}`);
  const [statusFilter, setStatusFilter] = useState<Set<StatusKey>>(
    new Set(["COMPLETED", "SCHEDULED", "CANCELLED", "NO_SHOW"])
  );

  const monthOptions = useMemo(() => {
    const map = new Map<string, { year: number; month: number }>();
    for (const a of appointments) {
      const d = new Date(a.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map.has(k)) map.set(k, { year: d.getFullYear(), month: d.getMonth() });
    }
    return [...map.values()].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [appointments]);

  const tabAppointments = useMemo(() => {
    if (tab === "dia") {
      const day = new Date(dayStr + "T00:00:00");
      const start = startOfDay(day).getTime();
      const end = endOfDay(day).getTime();
      return appointments.filter((a) => {
        const t = new Date(a.date).getTime();
        return t >= start && t <= end;
      });
    }
    const [y, m] = monthKey.split("-").map(Number);
    return appointments.filter((a) => {
      const d = new Date(a.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [tab, dayStr, monthKey, appointments]);

  const filtered = useMemo(
    () => tabAppointments.filter((a) => statusFilter.has(a.status as StatusKey)),
    [tabAppointments, statusFilter]
  );

  const stats = useMemo(() => {
    const completed = filtered.filter((a) => a.status === "COMPLETED").length;
    const scheduled = filtered.filter((a) => a.status === "SCHEDULED").length;
    const cancelled = filtered.filter(
      (a) => a.status === "CANCELLED" || a.status === "NO_SHOW"
    ).length;
    const byCategory: Record<Category, number> = {
      consultas: 0, cirugias: 0, vacunaciones: 0, otros: 0,
    };
    const petCounts = new Map<string, number>();
    const svcCounts = new Map<string, number>();
    for (const a of filtered) {
      byCategory[categoryFor(a.serviceName)]++;
      petCounts.set(a.petName, (petCounts.get(a.petName) ?? 0) + 1);
      svcCounts.set(a.serviceName, (svcCounts.get(a.serviceName) ?? 0) + 1);
    }
    const topPetEntry = [...petCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topSvcEntry = [...svcCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      total: filtered.length,
      completed, scheduled, cancelled, byCategory,
      topPet: topPetEntry ? { name: topPetEntry[0], count: topPetEntry[1] } : null,
      topService: topSvcEntry ? { name: topSvcEntry[0], count: topSvcEntry[1] } : null,
    };
  }, [filtered]);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 220);
  }

  function toggleStatus(s: StatusKey) {
    const next = new Set(statusFilter);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setStatusFilter(next);
  }

  // Friendly subtitle by tab
  const subtitle =
    tab === "dia"
      ? "Tu día en números"
      : "Tu mes en números";

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 ${
        closing ? "summary-backdrop-out" : "summary-backdrop-in"
      }`}
      style={{ background: "color-mix(in oklab, oklch(20% 0.04 240) 50%, transparent)" }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-[820px] max-h-[92vh] overflow-y-auto border ${
          closing ? "summary-card-out" : "summary-card-in"
        }`}
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 24,
          boxShadow: "0 24px 80px oklch(20% 0.04 240 / 0.45)",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b backdrop-blur"
          style={{
            background: "color-mix(in oklab, var(--vet-bg-card) 92%, transparent)",
            borderBottomColor: "var(--vet-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center"
              style={{ background: "var(--vet-green-glow)" }}
            >
              <VetIcon name="dashboard" size={18} color="var(--vet-green)" />
            </div>
            <div>
              <h2 className="text-[20px] font-black tracking-tight" style={{ color: "var(--vet-text-1)" }}>
                Resumen
              </h2>
              <p className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-[12px] border"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
          >
            <VetIcon name="close" size={18} color="var(--vet-text-2)" />
          </button>
        </div>

        <div className="p-5 sm:p-7 flex flex-col gap-5">
          {/* Tabs */}
          <div
            className="inline-flex p-1 rounded-[14px] border self-start"
            style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
          >
            {(["dia", "mes"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="px-5 h-9 rounded-[10px] text-[13px] font-extrabold transition-colors"
                style={{
                  background: tab === t ? "var(--vet-bg-card)" : "transparent",
                  color: tab === t ? "var(--vet-text-1)" : "var(--vet-text-3)",
                  boxShadow: tab === t ? "0 2px 6px oklch(50% 0.04 240 / 0.10)" : undefined,
                }}
              >
                {t === "dia" ? "Día" : "Mes"}
              </button>
            ))}
          </div>

          {/* Date selector */}
          {tab === "dia" ? (
            <div>
              <label
                className="block text-[12px] font-extrabold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--vet-text-3)" }}
              >
                Día
              </label>
              <input
                type="date"
                value={dayStr}
                onChange={(e) => setDayStr(e.target.value)}
                className="h-11 px-4 rounded-[12px] border outline-none text-[14px] font-bold"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-1)",
                }}
              />
            </div>
          ) : (
            <div>
              <label
                className="block text-[12px] font-extrabold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--vet-text-3)" }}
              >
                Mes
              </label>
              <select
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                className="h-11 px-4 pr-9 rounded-[12px] border outline-none text-[14px] font-bold"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-1)",
                  appearance: "none",
                  backgroundImage:
                    'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"12\\" height=\\"7\\" viewBox=\\"0 0 12 7\\"><path fill=\\"%2378819f\\" d=\\"M0 0l6 7 6-7z\\"/></svg>")',
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                }}
              >
                {monthOptions.map((m) => (
                  <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    {MONTH_NAMES[m.month]} {m.year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className="text-[11px] font-extrabold uppercase tracking-wider"
              style={{ color: "var(--vet-text-3)" }}
            >
              Mostrar:
            </span>
            {(["COMPLETED", "SCHEDULED", "CANCELLED"] as StatusKey[]).map((s) => {
              const active = statusFilter.has(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border transition-colors"
                  style={{
                    background: active
                      ? `color-mix(in oklab, ${STATUS_COLOR[s]} 15%, transparent)`
                      : "transparent",
                    borderColor: active
                      ? `color-mix(in oklab, ${STATUS_COLOR[s]} 40%, transparent)`
                      : "var(--vet-border)",
                    color: active ? STATUS_COLOR[s] : "var(--vet-text-3)",
                    opacity: active ? 1 : 0.55,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: STATUS_COLOR[s] }}
                  />
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>

          {/* Big friendly stats */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <BigStat label="Total" value={stats.total} emoji="📋" tint="var(--vet-text-1)" />
            <BigStat label="Atendidas" value={stats.completed} emoji="✅" tint="var(--vet-blue)" />
            <BigStat label="Pendientes" value={stats.scheduled} emoji="⏳" tint="var(--vet-green)" />
            <BigStat label="Canceladas" value={stats.cancelled} emoji="✕" tint="var(--vet-red)" />
          </div>

          {/* Highlights */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Highlight
              label="Paciente top"
              emoji="🏆"
              primary={stats.topPet?.name ?? "—"}
              secondary={stats.topPet ? `${stats.topPet.count} ${stats.topPet.count === 1 ? "visita" : "visitas"}` : "Sin datos"}
              color="var(--vet-amber)"
            />
            <Highlight
              label="Servicio top"
              emoji="⭐"
              primary={stats.topService?.name ?? "—"}
              secondary={stats.topService ? `${stats.topService.count} ${stats.topService.count === 1 ? "vez" : "veces"}` : "Sin datos"}
              color="var(--vet-violet)"
            />
          </div>

          {/* Donut + bars */}
          {stats.total > 0 ? (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
              <DonutChart byCategory={stats.byCategory} total={stats.total} />
              <CategoryBars byCategory={stats.byCategory} />
            </div>
          ) : (
            <div
              className="border p-10 rounded-[18px] text-center"
              style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
            >
              <div className="text-[44px] mb-2">🌿</div>
              <p className="text-[14px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                Sin citas en este {tab === "dia" ? "día" : "mes"}
              </p>
              <p className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                Prueba con otro {tab === "dia" ? "día" : "mes"} o cambia los filtros.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes summary-backdrop-in-kf {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes summary-backdrop-out-kf {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes summary-card-in-kf {
          from { opacity: 0; transform: perspective(1200px) rotateY(-22deg) scale(.85); }
          60%  { opacity: 1; transform: perspective(1200px) rotateY(2deg) scale(1.02); }
          to   { opacity: 1; transform: perspective(1200px) rotateY(0deg) scale(1); }
        }
        @keyframes summary-card-out-kf {
          from { opacity: 1; transform: perspective(1200px) rotateY(0deg) scale(1); }
          to   { opacity: 0; transform: perspective(1200px) rotateY(15deg) scale(.92); }
        }
        .summary-backdrop-in { animation: summary-backdrop-in-kf .18s ease both; }
        .summary-backdrop-out { animation: summary-backdrop-out-kf .2s ease both; }
        .summary-card-in {
          animation: summary-card-in-kf .42s cubic-bezier(.18,.89,.32,1.18) both;
          transform-origin: 80% 70%;
        }
        .summary-card-out {
          animation: summary-card-out-kf .22s cubic-bezier(.4,0,.6,1) both;
          transform-origin: 80% 70%;
        }
        @media (prefers-reduced-motion: reduce) {
          .summary-card-in, .summary-card-out,
          .summary-backdrop-in, .summary-backdrop-out { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────── */

function BigStat({
  label,
  value,
  emoji,
  tint,
}: {
  label: string;
  value: number;
  emoji: string;
  tint: string;
}) {
  return (
    <div
      className="border p-4 rounded-[16px]"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <div className="text-[20px] mb-1">{emoji}</div>
      <div className="vet-mono text-[28px] font-bold leading-none" style={{ color: tint }}>
        {value}
      </div>
      <div className="text-[12px] font-bold mt-1.5" style={{ color: "var(--vet-text-2)" }}>
        {label}
      </div>
    </div>
  );
}

function Highlight({
  label,
  emoji,
  primary,
  secondary,
  color,
}: {
  label: string;
  emoji: string;
  primary: string;
  secondary: string;
  color: string;
}) {
  return (
    <div
      className="border p-4 rounded-[16px] flex items-center gap-3"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0"
        style={{ background: `color-mix(in oklab, ${color} 15%, transparent)` }}
      >
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color: "var(--vet-text-3)" }}
        >
          {label}
        </div>
        <div className="text-[16px] font-extrabold truncate" style={{ color: "var(--vet-text-1)" }}>
          {primary}
        </div>
        <div className="vet-mono text-[12px] font-bold" style={{ color }}>
          {secondary}
        </div>
      </div>
    </div>
  );
}

function DonutChart({
  byCategory,
  total,
}: {
  byCategory: Record<Category, number>;
  total: number;
}) {
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const sum = total || 1;

  return (
    <div
      className="border p-5 rounded-[18px] flex flex-col items-center gap-4"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <h3 className="font-extrabold text-[14px] self-start" style={{ color: "var(--vet-text-1)" }}>
        Por categoría
      </h3>
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--vet-bg-hover)" strokeWidth="22" />
          {sum > 0 &&
            CATEGORY_META.map((cat) => {
              const v = byCategory[cat.key];
              const portion = v / sum;
              const dash = portion * c;
              const seg = (
                <circle
                  key={cat.key}
                  cx="90"
                  cy="90"
                  r={r}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth="22"
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 90 90)"
                />
              );
              offset += dash;
              return seg;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="vet-mono text-[28px] font-bold leading-none"
            style={{ color: "var(--vet-text-1)" }}
          >
            {total}
          </div>
          <div className="text-[11px] font-bold mt-1" style={{ color: "var(--vet-text-3)" }}>
            citas
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryBars({ byCategory }: { byCategory: Record<Category, number> }) {
  const max = Math.max(1, ...Object.values(byCategory));
  return (
    <div
      className="border p-5 rounded-[18px] flex flex-col gap-3"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <h3 className="font-extrabold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
        Distribución
      </h3>
      {CATEGORY_META.map((c) => {
        const v = byCategory[c.key];
        return (
          <div key={c.key}>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                {c.label}
              </span>
              <span
                className="vet-mono text-[12px] font-extrabold"
                style={{ color: "var(--vet-text-1)" }}
              >
                {v}
              </span>
            </div>
            <div className="h-[8px] rounded-full" style={{ background: "var(--vet-bg-hover)" }}>
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${(v / max) * 100}%`, background: c.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
