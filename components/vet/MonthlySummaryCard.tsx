"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { VetIcon } from "./VetIcon";

type MonthRow = { label: string; val: number; pct: number };

type AppointmentDetail = {
  id: string;
  date: string;
  status: string;
  priceEstimate: number;
  durationMinutes: number;
  petName: string;
  petSpecies: string;
  clientName: string;
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

type SortKey =
  | "default"
  | "recent"
  | "old"
  | "amountDesc"
  | "amountAsc"
  | "durationDesc"
  | "patient";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "Por defecto" },
  { key: "recent", label: "Recientes primero" },
  { key: "old", label: "Más antiguas primero" },
  { key: "amountDesc", label: "Monto: mayor a menor" },
  { key: "amountAsc", label: "Monto: menor a mayor" },
  { key: "durationDesc", label: "Duración: mayor a menor" },
  { key: "patient", label: "Por paciente (A–Z)" },
];

type FilterChip =
  | { type: "status"; value: StatusKey }
  | { type: "category"; value: Category };

const STATUS_OPTIONS: StatusKey[] = ["COMPLETED", "SCHEDULED", "CANCELLED"];

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
function formatMxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}
function formatTime(d: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(d);
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

  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("default");

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

  // Range
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

  // Derived filter sets
  const activeStatuses = useMemo(() => {
    const set = new Set<StatusKey>();
    for (const f of filters) if (f.type === "status") set.add(f.value);
    return set;
  }, [filters]);
  const activeCategories = useMemo(() => {
    const set = new Set<Category>();
    for (const f of filters) if (f.type === "category") set.add(f.value);
    return set;
  }, [filters]);

  const filtered = useMemo(() => {
    return tabAppointments.filter((a) => {
      if (activeStatuses.size > 0 && !activeStatuses.has(a.status as StatusKey)) {
        // Cancelled chip should match BOTH CANCELLED and NO_SHOW
        if (
          activeStatuses.has("CANCELLED") &&
          (a.status === "CANCELLED" || a.status === "NO_SHOW")
        ) {
          // pass
        } else {
          return false;
        }
      }
      if (activeCategories.size > 0 && !activeCategories.has(categoryFor(a.serviceName))) {
        return false;
      }
      return true;
    });
  }, [tabAppointments, activeStatuses, activeCategories]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "recent":
        arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "old":
        arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "amountDesc":
        arr.sort((a, b) => b.priceEstimate - a.priceEstimate);
        break;
      case "amountAsc":
        arr.sort((a, b) => a.priceEstimate - b.priceEstimate);
        break;
      case "durationDesc":
        arr.sort((a, b) => b.durationMinutes - a.durationMinutes);
        break;
      case "patient":
        arr.sort((a, b) => a.petName.localeCompare(b.petName));
        break;
      default:
        arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return arr;
  }, [filtered, sortKey]);

  // Insights (no overlap with dashboard KPIs)
  const insights = useMemo(() => {
    const completed = filtered.filter((a) => a.status === "COMPLETED");
    const totalRevenue = completed.reduce((acc, a) => acc + a.priceEstimate, 0);
    const totalDuration = filtered.reduce((acc, a) => acc + a.durationMinutes, 0);
    const avgDuration = filtered.length ? Math.round(totalDuration / filtered.length) : 0;
    const cancelled = filtered.filter(
      (a) => a.status === "CANCELLED" || a.status === "NO_SHOW"
    ).length;
    const attendanceRate = filtered.length
      ? Math.round((completed.length / filtered.length) * 100)
      : 0;

    const clientCounts = new Map<string, number>();
    const petCounts = new Map<string, number>();
    const svcCounts = new Map<string, number>();
    for (const a of filtered) {
      clientCounts.set(a.clientName, (clientCounts.get(a.clientName) ?? 0) + 1);
      petCounts.set(a.petName, (petCounts.get(a.petName) ?? 0) + 1);
      svcCounts.set(a.serviceName, (svcCounts.get(a.serviceName) ?? 0) + 1);
    }
    const top = (m: Map<string, number>) => {
      const e = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      return e ? { name: e[0], count: e[1] } : null;
    };

    const byCategory: Record<Category, number> = {
      consultas: 0, cirugias: 0, vacunaciones: 0, otros: 0,
    };
    for (const a of filtered) byCategory[categoryFor(a.serviceName)]++;

    return {
      total: filtered.length,
      revenue: totalRevenue,
      avgDuration,
      attendanceRate,
      cancelled,
      topClient: top(clientCounts),
      topPet: top(petCounts),
      topService: top(svcCounts),
      byCategory,
    };
  }, [filtered]);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 220);
  }

  function addFilter(chip: FilterChip) {
    setFilters((prev) => {
      if (prev.some((f) => f.type === chip.type && f.value === chip.value)) return prev;
      return [...prev, chip];
    });
  }
  function removeFilter(chip: FilterChip) {
    setFilters((prev) =>
      prev.filter((f) => !(f.type === chip.type && f.value === chip.value))
    );
  }

  const subtitle =
    tab === "dia"
      ? "Tu día en detalle — métricas e insights"
      : "Tu mes en detalle — métricas e insights";

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
        className={`relative w-full max-w-[1140px] max-h-[94vh] overflow-y-auto border ${
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
              <h2 className="text-[20px] sm:text-[22px] font-black tracking-tight" style={{ color: "var(--vet-text-1)" }}>
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

        <div className="p-5 sm:p-7 flex flex-col gap-6">
          {/* Tabs + range selector */}
          <div className="flex flex-wrap gap-4 items-end">
            <div
              className="inline-flex p-1 rounded-[14px] border"
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
            {tab === "dia" ? (
              <input
                type="date"
                value={dayStr}
                onChange={(e) => setDayStr(e.target.value)}
                className="h-9 px-3 rounded-[10px] border outline-none text-[13px] font-bold"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-1)",
                }}
              />
            ) : (
              <select
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                className="h-9 px-3 pr-8 rounded-[10px] border outline-none text-[13px] font-bold"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-1)",
                  appearance: "none",
                  backgroundImage:
                    'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"12\\" height=\\"7\\" viewBox=\\"0 0 12 7\\"><path fill=\\"%2378819f\\" d=\\"M0 0l6 7 6-7z\\"/></svg>")',
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                }}
              >
                {monthOptions.map((m) => (
                  <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    {MONTH_NAMES[m.month]} {m.year}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Insights — no overlap with dashboard KPIs */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <InsightTile
              label="Cliente top"
              primary={insights.topClient?.name ?? "—"}
              secondary={
                insights.topClient
                  ? `${insights.topClient.count} ${insights.topClient.count === 1 ? "visita" : "visitas"}`
                  : "Sin datos"
              }
              accent="var(--vet-blue)"
            />
            <InsightTile
              label="Paciente top"
              primary={insights.topPet?.name ?? "—"}
              secondary={
                insights.topPet
                  ? `${insights.topPet.count} ${insights.topPet.count === 1 ? "visita" : "visitas"}`
                  : "Sin datos"
              }
              accent="var(--vet-amber)"
            />
            <InsightTile
              label="Servicio top"
              primary={insights.topService?.name ?? "—"}
              secondary={
                insights.topService
                  ? `${insights.topService.count} ${insights.topService.count === 1 ? "vez" : "veces"}`
                  : "Sin datos"
              }
              accent="var(--vet-violet)"
            />
            <InsightTile
              label="Duración promedio"
              primary={`${insights.avgDuration} min`}
              secondary={
                insights.total
                  ? `Sobre ${insights.total} ${insights.total === 1 ? "cita" : "citas"}`
                  : "Sin datos"
              }
              accent="var(--vet-green)"
            />
            <InsightTile
              label="Ingreso esperado"
              primary={formatMxn(insights.revenue)}
              secondary="De citas atendidas"
              accent="var(--vet-violet)"
            />
            <InsightTile
              label="Asistencia"
              primary={`${insights.attendanceRate}%`}
              secondary={`${insights.cancelled} canceladas`}
              accent={
                insights.attendanceRate >= 85
                  ? "var(--vet-green)"
                  : insights.attendanceRate >= 70
                    ? "var(--vet-amber)"
                    : "var(--vet-red)"
              }
            />
          </div>

          {/* Distribution chart row */}
          {insights.total > 0 ? (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
              <DonutChart byCategory={insights.byCategory} total={insights.total} />
              <CategoryBars byCategory={insights.byCategory} />
            </div>
          ) : (
            <div
              className="border p-10 rounded-[18px] text-center"
              style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
            >
              <p className="text-[14px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                Sin citas en este {tab === "dia" ? "día" : "mes"}
              </p>
              <p className="text-[12px] font-semibold mt-1" style={{ color: "var(--vet-text-3)" }}>
                Prueba con otra fecha o quita los filtros.
              </p>
            </div>
          )}

          {/* Citas clave header */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <div>
              <h3
                className="text-[16px] font-extrabold tracking-tight"
                style={{ color: "var(--vet-text-1)" }}
              >
                Citas clave
              </h3>
              <p className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                {sorted.length} {sorted.length === 1 ? "cita" : "citas"}
                {filters.length > 0 ? " (con filtros)" : ""}
              </p>
            </div>
          </div>

          {/* Filter bar + sort */}
          <FilterBar
            filters={filters}
            onAdd={addFilter}
            onRemove={removeFilter}
            sortKey={sortKey}
            onSortChange={setSortKey}
          />

          {/* Citas list */}
          <AppointmentList appts={sorted} />
        </div>
      </div>

      <style>{`
        @keyframes summary-backdrop-in-kf { from { opacity: 0; } to { opacity: 1; } }
        @keyframes summary-backdrop-out-kf { from { opacity: 1; } to { opacity: 0; } }
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

/* ─── Insight tile ────────────────────────────────────── */

function InsightTile({
  label,
  primary,
  secondary,
  accent,
}: {
  label: string;
  primary: string;
  secondary: string;
  accent: string;
}) {
  return (
    <div
      className="border p-4 rounded-[16px] flex flex-col gap-1"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <div
        className="text-[10px] font-extrabold uppercase tracking-wider"
        style={{ color: "var(--vet-text-3)" }}
      >
        {label}
      </div>
      <div
        className="text-[20px] font-extrabold tracking-tight truncate"
        style={{ color: "var(--vet-text-1)" }}
      >
        {primary}
      </div>
      <div className="vet-mono text-[12px] font-bold" style={{ color: accent }}>
        {secondary}
      </div>
    </div>
  );
}

/* ─── Filter bar (chips + sort) ──────────────────────── */

function FilterBar({
  filters,
  onAdd,
  onRemove,
  sortKey,
  onSortChange,
}: {
  filters: FilterChip[];
  onAdd: (f: FilterChip) => void;
  onRemove: (f: FilterChip) => void;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
}) {
  const [filterMenu, setFilterMenu] = useState<null | "root" | "status" | "category">(null);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterMenu(null);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    if (filterMenu || sortOpen) {
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }
  }, [filterMenu, sortOpen]);

  function chipLabel(chip: FilterChip) {
    if (chip.type === "status") return STATUS_LABEL[chip.value];
    return CATEGORY_META.find((c) => c.key === chip.value)?.label ?? chip.value;
  }
  function chipColor(chip: FilterChip) {
    if (chip.type === "status") return STATUS_COLOR[chip.value];
    return CATEGORY_META.find((c) => c.key === chip.value)?.color ?? "var(--vet-text-3)";
  }
  function chipTypeLabel(t: "status" | "category") {
    return t === "status" ? "Estado" : "Servicio";
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* + Filtro button + dropdown */}
      <div ref={filterRef} className="relative">
        <button
          type="button"
          onClick={() =>
            setFilterMenu((m) => (m === null ? "root" : null))
          }
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12px] font-extrabold transition-colors"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: filterMenu ? "var(--vet-green)" : "var(--vet-border)",
            color: filterMenu ? "var(--vet-green)" : "var(--vet-text-2)",
            borderStyle: "dashed",
          }}
        >
          <VetIcon name="plus" size={12} color={filterMenu ? "var(--vet-green)" : "var(--vet-text-2)"} />
          Filtro
        </button>
        {filterMenu && (
          <div
            className="absolute left-0 top-11 z-50 min-w-[200px] border rounded-[14px] p-1.5 flex flex-col"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              boxShadow: "0 16px 40px oklch(20% 0.04 240 / 0.30)",
            }}
          >
            {filterMenu === "root" && (
              <>
                <div
                  className="text-[10px] font-extrabold uppercase tracking-wider px-3 pt-2 pb-1"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  Filtrar por
                </div>
                <button
                  type="button"
                  onClick={() => setFilterMenu("status")}
                  className="text-left px-3 py-2 rounded-[10px] text-[13px] font-bold flex items-center justify-between hover:[background:var(--vet-bg-hover)]"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  Estado
                  <VetIcon name="chevronRight" size={12} color="var(--vet-text-3)" />
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMenu("category")}
                  className="text-left px-3 py-2 rounded-[10px] text-[13px] font-bold flex items-center justify-between hover:[background:var(--vet-bg-hover)]"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  Servicio
                  <VetIcon name="chevronRight" size={12} color="var(--vet-text-3)" />
                </button>
              </>
            )}
            {filterMenu === "status" && (
              <>
                <button
                  type="button"
                  onClick={() => setFilterMenu("root")}
                  className="text-left px-3 py-2 rounded-[10px] text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  <VetIcon name="chevronLeft" size={12} color="var(--vet-text-3)" /> Estado
                </button>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      onAdd({ type: "status", value: s });
                      setFilterMenu(null);
                    }}
                    className="text-left px-3 py-2 rounded-[10px] text-[13px] font-bold flex items-center gap-2 hover:[background:var(--vet-bg-hover)]"
                    style={{ color: "var(--vet-text-1)" }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: STATUS_COLOR[s] }}
                    />
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </>
            )}
            {filterMenu === "category" && (
              <>
                <button
                  type="button"
                  onClick={() => setFilterMenu("root")}
                  className="text-left px-3 py-2 rounded-[10px] text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  <VetIcon name="chevronLeft" size={12} color="var(--vet-text-3)" /> Servicio
                </button>
                {CATEGORY_META.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      onAdd({ type: "category", value: c.key });
                      setFilterMenu(null);
                    }}
                    className="text-left px-3 py-2 rounded-[10px] text-[13px] font-bold flex items-center gap-2 hover:[background:var(--vet-bg-hover)]"
                    style={{ color: "var(--vet-text-1)" }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    {c.label}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {filters.map((f) => {
        const color = chipColor(f);
        return (
          <span
            key={`${f.type}-${f.value}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-[12px] font-extrabold"
            style={{
              background: `color-mix(in oklab, ${color} 12%, transparent)`,
              borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
              color,
            }}
          >
            <span style={{ color: "var(--vet-text-3)" }}>{chipTypeLabel(f.type)}</span>
            <span style={{ color: "var(--vet-text-3)", opacity: 0.6 }}>=</span>
            <span>{chipLabel(f)}</span>
            <button
              type="button"
              aria-label="Quitar filtro"
              onClick={() => onRemove(f)}
              className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:[background:color-mix(in_oklab,var(--vet-text-1)_15%,transparent)]"
              style={{ color }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sort */}
      <div ref={sortRef} className="relative">
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full border text-[12px] font-extrabold transition-colors"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: sortOpen ? "var(--vet-green)" : "var(--vet-border)",
            color: sortKey !== "default" ? "var(--vet-green)" : "var(--vet-text-2)",
          }}
        >
          <SortIcon color={sortKey !== "default" ? "var(--vet-green)" : "var(--vet-text-2)"} />
          Ordenar
          {sortKey !== "default" && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--vet-green-glow)", color: "var(--vet-green)" }}
            >
              1
            </span>
          )}
        </button>
        {sortOpen && (
          <div
            className="absolute right-0 top-11 z-50 min-w-[240px] border rounded-[14px] p-1.5 flex flex-col"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              boxShadow: "0 16px 40px oklch(20% 0.04 240 / 0.30)",
            }}
          >
            <div
              className="text-[10px] font-extrabold uppercase tracking-wider px-3 pt-2 pb-1"
              style={{ color: "var(--vet-text-3)" }}
            >
              Ordenar por
            </div>
            {SORT_OPTIONS.map((opt) => {
              const active = sortKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onSortChange(opt.key);
                    setSortOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-[10px] text-[13px] font-bold flex items-center justify-between hover:[background:var(--vet-bg-hover)]"
                  style={{
                    background: active ? "var(--vet-green-glow)" : "transparent",
                    color: active ? "var(--vet-green)" : "var(--vet-text-1)",
                  }}
                >
                  {opt.label}
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SortIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  );
}

/* ─── Appointment list ────────────────────────────────── */

function AppointmentList({ appts }: { appts: AppointmentDetail[] }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(appts.length / PAGE_SIZE) || 1;
  const visible = appts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (appts.length === 0) {
    return (
      <div
        className="py-10 px-4 text-center border rounded-[16px]"
        style={{ borderColor: "var(--vet-border)", color: "var(--vet-text-3)" }}
      >
        <p className="text-[14px] font-bold" style={{ color: "var(--vet-text-2)" }}>
          Ninguna cita coincide con los filtros
        </p>
        <p className="text-[12px] font-semibold mt-1">
          Cambia de fecha o quita filtros para ver más.
        </p>
      </div>
    );
  }

  return (
    <div
      className="border overflow-hidden rounded-[18px]"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <div className="divide-y" style={{ borderColor: "var(--vet-border)" }}>
        {visible.map((a) => {
          const status = a.status as StatusKey;
          return (
            <Link
              key={a.id}
              href={`/vet/cita/${a.id}`}
              className="grid items-center gap-3 px-4 py-3 transition-colors no-underline hover:[background:var(--vet-bg-hover)]"
              style={{
                gridTemplateColumns: "auto 1fr auto auto auto",
                color: "var(--vet-text-1)",
              }}
            >
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: `color-mix(in oklab, ${STATUS_COLOR[status] ?? "var(--vet-text-3)"} 12%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${STATUS_COLOR[status] ?? "var(--vet-text-3)"} 30%, transparent)`,
                }}
              >
                <span
                  className="vet-mono text-[12px] font-extrabold"
                  style={{ color: STATUS_COLOR[status] ?? "var(--vet-text-3)" }}
                >
                  {a.petName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[14px] font-extrabold truncate"
                    style={{ color: "var(--vet-text-1)" }}
                  >
                    {a.petName}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--vet-text-3)" }}>·</span>
                  <span className="text-[12px] font-semibold truncate" style={{ color: "var(--vet-text-2)" }}>
                    {a.clientName}
                  </span>
                </div>
                <div
                  className="text-[12px] font-semibold mt-0.5 truncate"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {a.serviceName} · {a.durationMinutes} min
                </div>
              </div>
              <span
                className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase"
                style={{
                  background: `color-mix(in oklab, ${STATUS_COLOR[status]} 15%, transparent)`,
                  color: STATUS_COLOR[status],
                }}
              >
                {STATUS_LABEL[status] ?? status}
              </span>
              <span
                className="vet-mono text-[12px] font-extrabold whitespace-nowrap"
                style={{ color: "var(--vet-text-3)" }}
              >
                {formatDateTime(new Date(a.date))}
              </span>
              <span
                className="vet-mono text-[13px] font-extrabold whitespace-nowrap"
                style={{ color: "var(--vet-text-1)" }}
              >
                {formatMxn(a.priceEstimate)}
              </span>
            </Link>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderTopColor: "var(--vet-border)" }}
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[12px] font-extrabold disabled:opacity-40"
            style={{ color: "var(--vet-green)" }}
          >
            ← Anterior
          </button>
          <span className="text-[11px] font-bold" style={{ color: "var(--vet-text-3)" }}>
            Página {page + 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-[12px] font-extrabold disabled:opacity-40"
            style={{ color: "var(--vet-green)" }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Charts ──────────────────────────────────────────── */

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
                  cx="90" cy="90" r={r}
                  fill="none" stroke={cat.color}
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
          <div className="vet-mono text-[28px] font-bold leading-none" style={{ color: "var(--vet-text-1)" }}>
            {total}
          </div>
          <div className="text-[11px] font-bold mt-1" style={{ color: "var(--vet-text-3)" }}>
            citas
          </div>
        </div>
      </div>
      <Legend />
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
              <span className="vet-mono text-[12px] font-extrabold" style={{ color: "var(--vet-text-1)" }}>
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

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
      {CATEGORY_META.map((c) => (
        <div key={c.key} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} aria-hidden />
          <span className="text-[11px] font-bold" style={{ color: "var(--vet-text-3)" }}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
