"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
const MONTH_NAMES_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
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
const ALL_STATUSES: StatusKey[] = ["COMPLETED", "SCHEDULED", "CANCELLED", "NO_SHOW"];
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

type Tab = "dia" | "mes" | "año" | "comparar";

function formatMxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}
function formatDateShort(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(d);
}
function formatTime(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hour12: false }).format(d);
}

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

/* ─── Aggregation ─────────────────────────────────────── */

type Aggregate = {
  total: number;
  completed: number;
  scheduled: number;
  cancelled: number; // includes NO_SHOW
  revenue: number;
  avgPerAppt: number;
  byCategory: Record<Category, number>;
  topPet: { name: string; count: number } | null;
  topService: { name: string; count: number } | null;
};

function aggregate(appts: AppointmentDetail[]): Aggregate {
  const completed = appts.filter((a) => a.status === "COMPLETED");
  const scheduled = appts.filter((a) => a.status === "SCHEDULED");
  const cancelled = appts.filter(
    (a) => a.status === "CANCELLED" || a.status === "NO_SHOW"
  );
  const revenue = completed.reduce((acc, a) => acc + a.priceEstimate, 0);
  const totalPrice = appts.reduce((acc, a) => acc + a.priceEstimate, 0);

  const byCategory: Record<Category, number> = {
    consultas: 0, cirugias: 0, vacunaciones: 0, otros: 0,
  };
  const petCounts = new Map<string, number>();
  const svcCounts = new Map<string, number>();
  for (const a of appts) {
    byCategory[categoryFor(a.serviceName)]++;
    petCounts.set(a.petName, (petCounts.get(a.petName) ?? 0) + 1);
    svcCounts.set(a.serviceName, (svcCounts.get(a.serviceName) ?? 0) + 1);
  }
  const topPetEntry = [...petCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topSvcEntry = [...svcCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    total: appts.length,
    completed: completed.length,
    scheduled: scheduled.length,
    cancelled: cancelled.length,
    revenue,
    avgPerAppt: appts.length ? Math.round(totalPrice / appts.length) : 0,
    byCategory,
    topPet: topPetEntry ? { name: topPetEntry[0], count: topPetEntry[1] } : null,
    topService: topSvcEntry ? { name: topSvcEntry[0], count: topSvcEntry[1] } : null,
  };
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

/* ─── Modal shell ─────────────────────────────────────── */

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

  // Día: which date
  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();
  const [dayStr, setDayStr] = useState(todayStr);

  // Mes: which month
  const [monthKey, setMonthKey] = useState(`${currentMonth.year}-${currentMonth.month}`);

  // Comparar: which months
  const [combined, setCombined] = useState<Set<string>>(
    new Set([`${currentMonth.year}-${currentMonth.month}`])
  );

  // Filters (apply across all tabs)
  const [statusFilter, setStatusFilter] = useState<Set<StatusKey>>(new Set(ALL_STATUSES));
  const [categoryFilter, setCategoryFilter] = useState<Set<Category>>(
    new Set(CATEGORY_META.map((c) => c.key))
  );

  // Appointments per tab (before filters)
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
    if (tab === "mes") {
      const [y, m] = monthKey.split("-").map(Number);
      return appointments.filter((a) => {
        const d = new Date(a.date);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }
    if (tab === "comparar") {
      return appointments.filter((a) => {
        const d = new Date(a.date);
        return combined.has(`${d.getFullYear()}-${d.getMonth()}`);
      });
    }
    // año
    return appointments;
  }, [tab, dayStr, monthKey, combined, appointments]);

  // After filters
  const filtered = useMemo(() => {
    return tabAppointments.filter(
      (a) =>
        statusFilter.has(a.status as StatusKey) &&
        categoryFilter.has(categoryFor(a.serviceName))
    );
  }, [tabAppointments, statusFilter, categoryFilter]);

  const stats = useMemo(() => aggregate(filtered), [filtered]);

  // Available months in data
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

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 220);
  }

  function exportCsv() {
    const rows = [
      ["Fecha", "Hora", "Paciente", "Servicio", "Estado", "Precio"],
      ...filtered.map((a) => {
        const d = new Date(a.date);
        return [
          new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d),
          formatTime(d),
          a.petName,
          a.serviceName,
          STATUS_LABEL[a.status as StatusKey] ?? a.status,
          a.priceEstimate.toString(),
        ];
      }),
      [],
      ["Resumen"],
      ["Total", String(stats.total)],
      ["Atendidas", String(stats.completed)],
      ["Pendientes", String(stats.scheduled)],
      ["Canceladas", String(stats.cancelled)],
      ["Ingresos (MXN)", String(stats.revenue)],
      ["Promedio por cita (MXN)", String(stats.avgPerAppt)],
      ["Paciente top", stats.topPet ? `${stats.topPet.name} (${stats.topPet.count})` : "—"],
      ["Servicio top", stats.topService ? `${stats.topService.name} (${stats.topService.count})` : "—"],
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumen-${vetName.replace(/\s+/g, "_")}-${tab}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function toggleStatus(s: StatusKey) {
    const next = new Set(statusFilter);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setStatusFilter(next);
  }
  function toggleCategory(c: Category) {
    const next = new Set(categoryFilter);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setCategoryFilter(next);
  }
  function toggleMonth(k: string) {
    const next = new Set(combined);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setCombined(next);
  }

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
        className={`relative w-full max-w-[1100px] max-h-[92vh] overflow-y-auto border ${
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
          <div>
            <h2
              className="text-[20px] sm:text-[22px] font-black tracking-tight"
              style={{ color: "var(--vet-text-1)" }}
            >
              Resumen
            </h2>
            <p className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
              Métricas de tus citas con filtros y exportación
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="hidden sm:inline-flex items-center gap-2 px-4 h-10 rounded-[12px] text-[13px] font-extrabold border transition-colors"
              style={{
                background: "var(--vet-bg-mid)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-1)",
              }}
            >
              <ExportIcon /> Exportar
            </button>
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
        </div>

        {/* Tabs + mobile export */}
        <div className="px-5 sm:px-7 pt-5 flex flex-wrap gap-3 items-center">
          <div
            className="inline-flex p-1 rounded-[14px] border flex-wrap"
            style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
          >
            {(["dia", "mes", "año", "comparar"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="px-4 h-9 rounded-[10px] text-[13px] font-extrabold capitalize transition-colors"
                style={{
                  background: tab === t ? "var(--vet-bg-card)" : "transparent",
                  color: tab === t ? "var(--vet-text-1)" : "var(--vet-text-3)",
                  boxShadow: tab === t ? "0 2px 6px oklch(50% 0.04 240 / 0.10)" : undefined,
                }}
              >
                {t === "dia"
                  ? "Día"
                  : t === "mes"
                    ? "Mes"
                    : t === "año"
                      ? "Año"
                      : "Comparar"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="sm:hidden inline-flex items-center gap-2 px-3 h-9 rounded-[10px] text-[12px] font-extrabold border"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-1)",
            }}
          >
            <ExportIcon /> Exportar
          </button>
        </div>

        {/* Range selector by tab */}
        <div className="px-5 sm:px-7 pt-4">
          {tab === "dia" && (
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
          )}
          {tab === "mes" && (
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
          {tab === "comparar" && (
            <div>
              <label
                className="block text-[12px] font-extrabold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--vet-text-3)" }}
              >
                Selecciona los meses a combinar
              </label>
              <div className="flex flex-wrap gap-2">
                {monthOptions.map((m) => {
                  const k = `${m.year}-${m.month}`;
                  const active = combined.has(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleMonth(k)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors"
                      style={{
                        background: active ? "var(--vet-green-glow)" : "transparent",
                        borderColor: active ? "var(--vet-green)" : "var(--vet-border)",
                        color: active ? "var(--vet-green)" : "var(--vet-text-2)",
                      }}
                    >
                      {MONTH_NAMES_SHORT[m.month]} {String(m.year).slice(2)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="px-5 sm:px-7 pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className="text-[11px] font-extrabold uppercase tracking-wider"
              style={{ color: "var(--vet-text-3)" }}
            >
              Estado:
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
                    opacity: active ? 1 : 0.6,
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2">
            <span
              className="text-[11px] font-extrabold uppercase tracking-wider"
              style={{ color: "var(--vet-text-3)" }}
            >
              Servicio:
            </span>
            {CATEGORY_META.map((c) => {
              const active = categoryFilter.has(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCategory(c.key)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border transition-colors"
                  style={{
                    background: active
                      ? `color-mix(in oklab, ${c.color} 15%, transparent)`
                      : "transparent",
                    borderColor: active
                      ? `color-mix(in oklab, ${c.color} 40%, transparent)`
                      : "var(--vet-border)",
                    color: active ? c.color : "var(--vet-text-3)",
                    opacity: active ? 1 : 0.6,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-7 flex flex-col gap-5">
          <StatsGrid stats={stats} />

          <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
            <DonutCategoryChart byCategory={stats.byCategory} total={stats.total} />
            <CategoryBars byCategory={stats.byCategory} />
          </div>

          {tab === "dia" && <HourlyChart appts={filtered} />}
          {tab === "mes" && <DailyChart appts={filtered} monthKey={monthKey} />}
          {tab === "año" && <YearlyChart appts={appointments} statusFilter={statusFilter} categoryFilter={categoryFilter} />}

          <DetailsList appts={filtered} />
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

/* ─── Stats grid ───────────────────────────────────────── */

function StatsGrid({ stats }: { stats: Aggregate }) {
  const tiles = [
    { label: "Total citas", value: stats.total, color: "var(--vet-text-1)" },
    { label: "Atendidas", value: stats.completed, color: "var(--vet-blue)" },
    { label: "Pendientes", value: stats.scheduled, color: "var(--vet-green)" },
    { label: "Canceladas", value: stats.cancelled, color: "var(--vet-red)" },
    { label: "Ingresos", value: formatMxn(stats.revenue), color: "var(--vet-violet)" },
    {
      label: "Promedio",
      value: formatMxn(stats.avgPerAppt),
      color: "var(--vet-amber)",
      sub: "por cita",
    },
  ];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="border p-3.5 rounded-[14px]"
          style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
        >
          <div
            className="vet-mono text-[20px] font-bold leading-tight"
            style={{ color: t.color }}
          >
            {t.value}
          </div>
          <div className="text-[11px] font-bold mt-1" style={{ color: "var(--vet-text-2)" }}>
            {t.label}
          </div>
          {t.sub && (
            <div className="text-[10px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
              {t.sub}
            </div>
          )}
        </div>
      ))}
      <TopTile
        label="Paciente top"
        primary={stats.topPet?.name ?? "—"}
        secondary={stats.topPet ? `${stats.topPet.count} cita${stats.topPet.count > 1 ? "s" : ""}` : ""}
        color="var(--vet-amber)"
      />
      <TopTile
        label="Servicio top"
        primary={stats.topService?.name ?? "—"}
        secondary={stats.topService ? `${stats.topService.count} vez${stats.topService.count > 1 ? "ces" : ""}` : ""}
        color="var(--vet-violet)"
      />
    </div>
  );
}

function TopTile({
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
      className="border p-3.5 rounded-[14px] col-span-2 lg:col-span-3 xl:col-span-3"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <div
        className="text-[10px] font-extrabold uppercase tracking-wider mb-1"
        style={{ color: "var(--vet-text-3)" }}
      >
        {label}
      </div>
      <div className="text-[16px] font-extrabold truncate" style={{ color: "var(--vet-text-1)" }}>
        {primary}
      </div>
      {secondary && (
        <div className="vet-mono text-[12px] font-bold mt-0.5" style={{ color }}>
          {secondary}
        </div>
      )}
    </div>
  );
}

/* ─── Charts ───────────────────────────────────────────── */

function DonutCategoryChart({
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

function HourlyChart({ appts }: { appts: AppointmentDetail[] }) {
  const buckets = Array.from({ length: 12 }, (_, i) => ({ hour: 8 + i, count: 0 }));
  for (const a of appts) {
    const h = new Date(a.date).getHours();
    const idx = h - 8;
    if (idx >= 0 && idx < buckets.length) buckets[idx].count++;
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div
      className="border p-5 rounded-[18px]"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <h3 className="font-extrabold text-[14px] mb-4" style={{ color: "var(--vet-text-1)" }}>
        Distribución por hora
      </h3>
      <div className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end" style={{ height: 160 }}>
        {buckets.map((b) => {
          const heightPct = (b.count / max) * 100;
          return (
            <div key={b.hour} className="flex flex-col items-center gap-1.5 h-full" title={`${b.hour}:00 → ${b.count} citas`}>
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-t-[6px]"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: b.count > 0 ? 4 : 0,
                    background: "var(--vet-green)",
                  }}
                />
              </div>
              <div className="text-[10px] font-extrabold" style={{ color: "var(--vet-text-3)" }}>
                {b.hour}h
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyChart({ appts, monthKey }: { appts: AppointmentDetail[]; monthKey: string }) {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const buckets = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, count: 0 }));
  for (const a of appts) {
    const d = new Date(a.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      buckets[d.getDate() - 1].count++;
    }
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div
      className="border p-5 rounded-[18px]"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <h3 className="font-extrabold text-[14px] mb-4" style={{ color: "var(--vet-text-1)" }}>
        Citas por día
      </h3>
      <div
        className="grid gap-[3px] items-end"
        style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))`, height: 160 }}
      >
        {buckets.map((b) => {
          const heightPct = (b.count / max) * 100;
          return (
            <div key={b.day} className="flex flex-col items-center gap-1 h-full" title={`Día ${b.day}: ${b.count} citas`}>
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-t-[3px]"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: b.count > 0 ? 3 : 0,
                    background: "var(--vet-green)",
                  }}
                />
              </div>
              {b.day % 5 === 0 || b.day === 1 ? (
                <div className="text-[9px] font-extrabold" style={{ color: "var(--vet-text-3)" }}>
                  {b.day}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearlyChart({
  appts,
  statusFilter,
  categoryFilter,
}: {
  appts: AppointmentDetail[];
  statusFilter: Set<StatusKey>;
  categoryFilter: Set<Category>;
}) {
  // Build 12 months back from current month
  const now = new Date();
  const monthKeys: { year: number; month: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const buckets = monthKeys.map((mk) => {
    const filtered = appts.filter((a) => {
      const d = new Date(a.date);
      return (
        d.getFullYear() === mk.year &&
        d.getMonth() === mk.month &&
        statusFilter.has(a.status as StatusKey) &&
        categoryFilter.has(categoryFor(a.serviceName))
      );
    });
    const byCat: Record<Category, number> = {
      consultas: 0, cirugias: 0, vacunaciones: 0, otros: 0,
    };
    for (const a of filtered) byCat[categoryFor(a.serviceName)]++;
    return { ...mk, total: filtered.length, byCat };
  });

  const max = Math.max(1, ...buckets.map((b) => b.total));

  return (
    <div
      className="border p-5 rounded-[18px]"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
          Citas por mes (últimos 12 meses)
        </h3>
        <Legend />
      </div>
      <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end" style={{ height: 240 }}>
        {buckets.map((b) => {
          const heightPct = (b.total / max) * 100;
          return (
            <div
              key={`${b.year}-${b.month}`}
              className="flex flex-col items-center gap-1.5 h-full"
              title={`${MONTH_NAMES[b.month]} ${b.year}: ${b.total}`}
            >
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-t-[6px] flex flex-col-reverse overflow-hidden"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: b.total > 0 ? 4 : 0,
                    background: "var(--vet-bg-hover)",
                  }}
                >
                  {CATEGORY_META.map((cat) => {
                    const v = b.byCat[cat.key];
                    if (!v) return null;
                    return (
                      <div
                        key={cat.key}
                        style={{
                          background: cat.color,
                          height: `${(v / Math.max(1, b.total)) * 100}%`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="text-[10px] font-extrabold" style={{ color: "var(--vet-text-3)" }}>
                {MONTH_NAMES_SHORT[b.month]}
              </div>
            </div>
          );
        })}
      </div>
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

/* ─── Details list ─────────────────────────────────────── */

function DetailsList({ appts }: { appts: AppointmentDetail[] }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const totalPages = Math.ceil(appts.length / PAGE_SIZE) || 1;
  const visible = appts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div
      className="border rounded-[18px] overflow-hidden"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="text-left">
          <div className="font-extrabold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
            Detalle de citas
          </div>
          <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
            {appts.length} {appts.length === 1 ? "cita" : "citas"} con los filtros aplicados
          </div>
        </div>
        <span style={{ transform: expanded ? "rotate(90deg)" : "rotate(0)", transition: "transform .15s" }}>
          <VetIcon name="chevronRight" size={16} color="var(--vet-text-2)" />
        </span>
      </button>

      {expanded && (
        <>
          {appts.length === 0 ? (
            <div
              className="px-5 py-10 text-center text-[13px] font-semibold border-t"
              style={{ borderTopColor: "var(--vet-border)", color: "var(--vet-text-3)" }}
            >
              Ninguna cita coincide con los filtros.
            </div>
          ) : (
            <>
              <div className="divide-y" style={{ borderColor: "var(--vet-border)" }}>
                {visible.map((a) => {
                  const d = new Date(a.date);
                  const status = a.status as StatusKey;
                  return (
                    <Link
                      key={a.id}
                      href={`/vet/cita/${a.id}`}
                      className="grid items-center gap-3 px-5 py-3 transition-colors no-underline hover:[background:var(--vet-bg-hover)]"
                      style={{ gridTemplateColumns: "auto 1fr auto auto", color: "var(--vet-text-1)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[14px] font-extrabold"
                        style={{
                          background: `color-mix(in oklab, ${STATUS_COLOR[status] ?? "var(--vet-text-3)"} 15%, transparent)`,
                          color: STATUS_COLOR[status] ?? "var(--vet-text-3)",
                        }}
                      >
                        {a.petName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-[13px] font-extrabold truncate"
                          style={{ color: "var(--vet-text-1)" }}
                        >
                          {a.petName} · {a.serviceName}
                        </div>
                        <div
                          className="text-[12px] font-semibold"
                          style={{ color: "var(--vet-text-3)" }}
                        >
                          {formatDateShort(d)} · {formatTime(d)}
                        </div>
                      </div>
                      <span
                        className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase"
                        style={{
                          background: `color-mix(in oklab, ${STATUS_COLOR[status]} 15%, transparent)`,
                          color: STATUS_COLOR[status],
                        }}
                      >
                        {STATUS_LABEL[status] ?? status}
                      </span>
                      <span
                        className="vet-mono text-[12px] font-extrabold whitespace-nowrap"
                        style={{ color: "var(--vet-text-2)" }}
                      >
                        {formatMxn(a.priceEstimate)}
                      </span>
                    </Link>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between px-5 py-3 border-t"
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
            </>
          )}
        </>
      )}
    </div>
  );
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
