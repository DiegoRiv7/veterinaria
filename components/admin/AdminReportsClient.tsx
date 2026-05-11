"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Download,
  Heart,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────── */

export type Appointment = {
  id: string;
  date: string;
  status: string;
  priceEstimate: number;
  petName: string;
  petSpecies: string;
  serviceName: string;
  vetId: string;
  vetName: string;
  clientId: string;
  clientName: string;
};

type Vet = { id: string; name: string; photoUrl: string | null };
type Client = { id: string; name: string };

type KpiKey = "completed" | "revenue" | "topService" | "topClient";

type Selection<T extends number | string> = "all" | ReadonlySet<T>;

/* ─── Constants ───────────────────────────────────────── */

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const MONTH_NAMES_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const KPI_COLOR: Record<KpiKey, string> = {
  completed: "var(--vet-green)",
  revenue: "var(--vet-blue-dim)",
  topService: "var(--vet-violet)",
  topClient: "var(--vet-amber)",
};

/* ─── Helpers ─────────────────────────────────────────── */

function formatMxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDateShort(d: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatTime(d: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function inSelection<T extends number | string>(
  sel: Selection<T>,
  value: T
): boolean {
  return sel === "all" || sel.has(value);
}

function selectionSize<T extends number | string>(
  sel: Selection<T>,
  allCount: number
): number {
  return sel === "all" ? allCount : sel.size;
}

function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onOutside: () => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [enabled, onOutside, ref]);
}

/* ─── Main ────────────────────────────────────────────── */

type Props = {
  appointments: Appointment[];
  vets: Vet[];
  clients: Client[];
};

export function AdminReportsClient({ appointments, vets, clients }: Props) {
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();

  const [months, setMonths] = useState<Selection<number>>(
    new Set([todayMonth])
  );
  const [years, setYears] = useState<Selection<number>>(new Set([todayYear]));
  const [vetSel, setVetSel] = useState<Selection<string>>("all");
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null);

  // Years present in data (oldest..newest)
  const availableYears = useMemo(() => {
    const s = new Set<number>([todayYear]);
    for (const a of appointments) s.add(new Date(a.date).getFullYear());
    return [...s].sort((a, b) => b - a);
  }, [appointments, todayYear]);

  // Apply filters
  const filtered = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.date);
        return (
          inSelection(months, d.getMonth()) &&
          inSelection(years, d.getFullYear()) &&
          inSelection(vetSel, a.vetId)
        );
      }),
    [appointments, months, years, vetSel]
  );

  const stats = useMemo(() => aggregate(filtered), [filtered]);

  // Previous period (only when exactly 1 month + 1 year + all/single vet)
  const prevPeriod = useMemo(() => {
    if (
      months === "all" ||
      years === "all" ||
      months.size !== 1 ||
      years.size !== 1
    )
      return null;
    const m = [...months][0];
    const y = [...years][0];
    const prevM = m === 0 ? 11 : m - 1;
    const prevY = m === 0 ? y - 1 : y;
    const prev = appointments.filter((a) => {
      const d = new Date(a.date);
      return (
        d.getMonth() === prevM &&
        d.getFullYear() === prevY &&
        inSelection(vetSel, a.vetId)
      );
    });
    return { stats: aggregate(prev), label: `${MONTH_NAMES_SHORT[prevM]} ${prevY}` };
  }, [appointments, months, years, vetSel]);

  function resetPeriod() {
    setMonths(new Set([todayMonth]));
    setYears(new Set([todayYear]));
  }

  function exportCsv() {
    const header = [
      "Fecha",
      "Hora",
      "Estado",
      "Veterinario",
      "Cliente",
      "Mascota",
      "Servicio",
      "Precio",
    ];
    const rows = filtered.map((a) => {
      const d = new Date(a.date);
      return [
        new Intl.DateTimeFormat("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(d),
        formatTime(d),
        a.status,
        a.vetName,
        a.clientName,
        a.petName,
        a.serviceName,
        a.priceEstimate.toString(),
      ];
    });
    const summary = [
      [],
      ["Resumen del periodo"],
      ["Citas atendidas", String(stats.completed)],
      ["Ingresos (MXN)", String(stats.revenue)],
      [
        "Servicio top",
        stats.topService
          ? `${stats.topService.name} (${stats.topService.count})`
          : "—",
      ],
      [
        "Cliente top",
        stats.topClient
          ? `${stats.topClient.name} (${stats.topClient.count})`
          : "—",
      ],
    ];
    const all = [header, ...rows, ...summary];
    const csv = all
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-vetsfriend-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1
            className="text-[26px] font-black tracking-tight"
            style={{ color: "var(--vet-text-1)" }}
          >
            Dashboard
          </h1>
          <p
            className="text-[13px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            {filtered.length} cita{filtered.length === 1 ? "" : "s"} ·{" "}
            {selectionSize(vetSel, vets.length)} veterinario
            {selectionSize(vetSel, vets.length) === 1 ? "" : "s"} ·{" "}
            {periodLabel(months, years)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodPicker
            months={months}
            years={years}
            availableYears={availableYears}
            defaultMonth={todayMonth}
            defaultYear={todayYear}
            onApply={(m, y) => {
              setMonths(m);
              setYears(y);
            }}
            onReset={resetPeriod}
          />
          <VetPicker vets={vets} selected={vetSel} onChange={setVetSel} />
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-[10px] text-[13px] font-extrabold text-white transition-all hover:brightness-105"
            style={{
              background:
                "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
              boxShadow: "0 6px 16px var(--vet-green-glow)",
            }}
          >
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          k="completed"
          label="Citas atendidas"
          value={String(stats.completed)}
          sub={`de ${stats.total} agendadas`}
          icon={<CheckCircle2 size={18} />}
          delta={
            prevPeriod
              ? deltaFor(stats.completed, prevPeriod.stats.completed)
              : null
          }
          prevLabel={prevPeriod?.label ?? null}
          active={activeKpi === "completed"}
          onClick={() =>
            setActiveKpi((v) => (v === "completed" ? null : "completed"))
          }
        />
        <KpiCard
          k="revenue"
          label="Ingresos"
          value={formatMxn(stats.revenue)}
          sub={
            stats.completed
              ? `${formatMxn(stats.avgPerCompleted)} promedio`
              : "sin citas atendidas"
          }
          icon={<Wallet size={18} />}
          delta={
            prevPeriod ? deltaFor(stats.revenue, prevPeriod.stats.revenue) : null
          }
          prevLabel={prevPeriod?.label ?? null}
          active={activeKpi === "revenue"}
          onClick={() =>
            setActiveKpi((v) => (v === "revenue" ? null : "revenue"))
          }
        />
        <KpiCard
          k="topService"
          label="Servicio más pedido"
          value={stats.topService?.name ?? "—"}
          sub={
            stats.topService
              ? `${stats.topService.count} ${stats.topService.count === 1 ? "cita" : "citas"}`
              : "Sin datos"
          }
          icon={<Sparkles size={18} />}
          delta={
            prevPeriod && stats.topService && prevPeriod.stats.topService
              ? deltaFor(
                  stats.topService.count,
                  prevPeriod.stats.topService.name === stats.topService.name
                    ? prevPeriod.stats.topService.count
                    : 0
                )
              : null
          }
          prevLabel={prevPeriod?.label ?? null}
          active={activeKpi === "topService"}
          onClick={() =>
            setActiveKpi((v) => (v === "topService" ? null : "topService"))
          }
        />
        <KpiCard
          k="topClient"
          label="Cliente con más visitas"
          value={stats.topClient?.name ?? "—"}
          sub={
            stats.topClient
              ? `${stats.topClient.count} ${stats.topClient.count === 1 ? "visita" : "visitas"}`
              : "Sin datos"
          }
          icon={<Heart size={18} />}
          delta={
            prevPeriod && stats.topClient && prevPeriod.stats.topClient
              ? deltaFor(
                  stats.topClient.count,
                  prevPeriod.stats.topClient.name === stats.topClient.name
                    ? prevPeriod.stats.topClient.count
                    : 0
                )
              : null
          }
          prevLabel={prevPeriod?.label ?? null}
          active={activeKpi === "topClient"}
          onClick={() =>
            setActiveKpi((v) => (v === "topClient" ? null : "topClient"))
          }
        />
      </div>

      {/* Body — graphs grid or KPI detail */}
      {activeKpi ? (
        <KpiDetail
          kpi={activeKpi}
          filtered={filtered}
          onBack={() => setActiveKpi(null)}
        />
      ) : (
        <ChartsGrid
          filtered={filtered}
          months={months}
          years={years}
          vets={vets}
        />
      )}
    </div>
  );
}

/* ─── Aggregate ───────────────────────────────────────── */

type Aggregate = {
  total: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  revenue: number;
  avgPerCompleted: number;
  topService: { name: string; count: number } | null;
  topClient: { name: string; count: number } | null;
  serviceCounts: Map<string, { count: number; revenue: number }>;
  clientStats: Map<
    string,
    {
      name: string;
      visits: number;
      completed: number;
      revenue: number;
      pets: Set<string>;
      lastDate: string | null;
      vetCounts: Map<string, number>;
    }
  >;
  vetStats: Map<
    string,
    {
      name: string;
      total: number;
      completed: number;
      revenue: number;
    }
  >;
};

function aggregate(appts: Appointment[]): Aggregate {
  const completedAppts = appts.filter((a) => a.status === "COMPLETED");
  const revenue = completedAppts.reduce((acc, a) => acc + a.priceEstimate, 0);

  const serviceCounts = new Map<
    string,
    { count: number; revenue: number }
  >();
  const clientStats = new Map<
    string,
    {
      name: string;
      visits: number;
      completed: number;
      revenue: number;
      pets: Set<string>;
      lastDate: string | null;
      vetCounts: Map<string, number>;
    }
  >();
  const vetStats = new Map<
    string,
    { name: string; total: number; completed: number; revenue: number }
  >();

  for (const a of appts) {
    // Services — count completed; revenue from completed
    const sCur = serviceCounts.get(a.serviceName) ?? { count: 0, revenue: 0 };
    if (a.status === "COMPLETED") {
      sCur.count++;
      sCur.revenue += a.priceEstimate;
    }
    serviceCounts.set(a.serviceName, sCur);

    // Clients — visits = completed, revenue from completed
    const cCur =
      clientStats.get(a.clientId) ?? {
        name: a.clientName,
        visits: 0,
        completed: 0,
        revenue: 0,
        pets: new Set<string>(),
        lastDate: null,
        vetCounts: new Map<string, number>(),
      };
    if (a.status === "COMPLETED") {
      cCur.visits++;
      cCur.completed++;
      cCur.revenue += a.priceEstimate;
      cCur.vetCounts.set(
        a.vetName,
        (cCur.vetCounts.get(a.vetName) ?? 0) + 1
      );
      if (!cCur.lastDate || a.date > cCur.lastDate) cCur.lastDate = a.date;
    }
    cCur.pets.add(a.petName);
    clientStats.set(a.clientId, cCur);

    // Vets
    const vCur =
      vetStats.get(a.vetId) ?? {
        name: a.vetName,
        total: 0,
        completed: 0,
        revenue: 0,
      };
    vCur.total++;
    if (a.status === "COMPLETED") {
      vCur.completed++;
      vCur.revenue += a.priceEstimate;
    }
    vetStats.set(a.vetId, vCur);
  }

  let topService: { name: string; count: number } | null = null;
  for (const [name, v] of serviceCounts) {
    if (!topService || v.count > topService.count)
      topService = { name, count: v.count };
  }
  let topClient: { name: string; count: number } | null = null;
  for (const c of clientStats.values()) {
    if (!topClient || c.visits > topClient.count) {
      topClient = { name: c.name, count: c.visits };
    }
  }

  return {
    total: appts.length,
    completed: completedAppts.length,
    scheduled: appts.filter((a) => a.status === "SCHEDULED").length,
    cancelled: appts.filter(
      (a) => a.status === "CANCELLED" || a.status === "NO_SHOW"
    ).length,
    revenue,
    avgPerCompleted: completedAppts.length
      ? Math.round(revenue / completedAppts.length)
      : 0,
    topService,
    topClient,
    serviceCounts,
    clientStats,
    vetStats,
  };
}

function deltaFor(current: number, prev: number): {
  pct: number;
  direction: "up" | "down" | "flat";
} {
  if (prev === 0 && current === 0) return { pct: 0, direction: "flat" };
  if (prev === 0) return { pct: 100, direction: "up" };
  const diff = current - prev;
  const pct = Math.round((diff / prev) * 100);
  if (pct === 0) return { pct: 0, direction: "flat" };
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : "down" };
}

function periodLabel(
  months: Selection<number>,
  years: Selection<number>
): string {
  if (months === "all" && years === "all") return "Histórico completo";
  if (months === "all" && years !== "all") {
    if (years.size === 1) return `Año ${[...years][0]}`;
    return `${years.size} años`;
  }
  if (years === "all" && months !== "all") {
    if (months.size === 1) return `${MONTH_NAMES[[...months][0]]} (todos los años)`;
    return `${months.size} meses (todos los años)`;
  }
  if (months !== "all" && years !== "all") {
    if (months.size === 1 && years.size === 1)
      return `${MONTH_NAMES[[...months][0]]} ${[...years][0]}`;
    if (years.size === 1)
      return `${months.size} meses · ${[...years][0]}`;
    if (months.size === 1)
      return `${MONTH_NAMES[[...months][0]]} · ${years.size} años`;
    return `${months.size} meses · ${years.size} años`;
  }
  return "Personalizado";
}

/* ─── KPI Card ────────────────────────────────────────── */

function KpiCard({
  k,
  label,
  value,
  sub,
  icon,
  delta,
  prevLabel,
  active,
  onClick,
}: {
  k: KpiKey;
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  delta: { pct: number; direction: "up" | "down" | "flat" } | null;
  prevLabel: string | null;
  active: boolean;
  onClick: () => void;
}) {
  const color = KPI_COLOR[k];
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative overflow-hidden flex flex-col gap-2 p-5 border text-left transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: active ? color : "var(--vet-border)",
        borderRadius: 20,
        boxShadow: active
          ? `0 12px 28px color-mix(in oklab, ${color} 22%, transparent)`
          : undefined,
      }}
    >
      <div
        aria-hidden
        className="absolute -top-5 -right-5 w-24 h-24 rounded-full opacity-15 blur-xl"
        style={{ background: color }}
      />
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider"
          style={{ color }}
        >
          <span
            className="w-7 h-7 rounded-[9px] flex items-center justify-center"
            style={{
              background: `color-mix(in oklab, ${color} 14%, transparent)`,
            }}
          >
            {icon}
          </span>
          {label}
        </div>
        <span
          className="text-[10px] font-extrabold inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
          style={{
            background: active
              ? `color-mix(in oklab, ${color} 18%, transparent)`
              : "var(--vet-bg-mid)",
            color: active ? color : "var(--vet-text-3)",
            border: `1px solid ${
              active
                ? `color-mix(in oklab, ${color} 34%, transparent)`
                : "var(--vet-border)"
            }`,
          }}
        >
          {active ? "Detalle" : "Ver detalle"} →
        </span>
      </div>
      <div
        className="text-[26px] font-black leading-tight truncate"
        style={{ color: "var(--vet-text-1)" }}
        title={value}
      >
        {value}
      </div>
      <div
        className="text-[12px] font-semibold"
        style={{ color: "var(--vet-text-3)" }}
      >
        {sub}
      </div>
      {delta && prevLabel && (
        <div
          className="text-[11px] font-extrabold flex items-center gap-1"
          style={{
            color:
              delta.direction === "up"
                ? "var(--vet-green)"
                : delta.direction === "down"
                ? "var(--vet-red)"
                : "var(--vet-text-3)",
          }}
        >
          {delta.direction === "up"
            ? "↑"
            : delta.direction === "down"
            ? "↓"
            : "→"}{" "}
          {delta.pct}% vs {prevLabel}
        </div>
      )}
    </button>
  );
}

/* ─── Period Picker ───────────────────────────────────── */

function PeriodPicker({
  months,
  years,
  availableYears,
  defaultMonth,
  defaultYear,
  onApply,
  onReset,
}: {
  months: Selection<number>;
  years: Selection<number>;
  availableYears: number[];
  defaultMonth: number;
  defaultYear: number;
  onApply: (m: Selection<number>, y: Selection<number>) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftMonths, setDraftMonths] = useState<Selection<number>>(months);
  const [draftYears, setDraftYears] = useState<Selection<number>>(years);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  // Sync draft when opening
  useEffect(() => {
    if (open) {
      setDraftMonths(months);
      setDraftYears(years);
    }
  }, [open, months, years]);

  function toggleMonth(m: number) {
    setDraftMonths((cur) => {
      if (cur === "all") return new Set([m]);
      const next = new Set(cur);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      if (next.size === 0) return "all";
      return next;
    });
  }
  function toggleYear(y: number) {
    setDraftYears((cur) => {
      if (cur === "all") return new Set([y]);
      const next = new Set(cur);
      if (next.has(y)) next.delete(y);
      else next.add(y);
      if (next.size === 0) return "all";
      return next;
    });
  }

  function applyHandler() {
    onApply(
      draftMonths === "all" ? "all" : new Set(draftMonths),
      draftYears === "all" ? "all" : new Set(draftYears)
    );
    setOpen(false);
  }
  function resetHandler() {
    setDraftMonths(new Set([defaultMonth]));
    setDraftYears(new Set([defaultYear]));
    onReset();
    setOpen(false);
  }

  const label = periodLabel(months, years);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3.5 h-10 rounded-[10px] border text-[13px] font-extrabold transition-colors"
        style={{
          background: open ? "var(--vet-bg-mid)" : "var(--vet-bg-card)",
          borderColor: open ? "var(--vet-green)" : "var(--vet-border)",
          color: open ? "var(--vet-green)" : "var(--vet-text-1)",
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Calendar size={14} />
        <span>{label}</span>
        <ChevronDown
          size={14}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform .15s",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+6px)] right-0 z-30 w-[420px] max-w-[calc(100vw-32px)] rounded-[14px] border overflow-hidden flex flex-col"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            boxShadow:
              "0 18px 48px color-mix(in oklab, oklch(20% 0.04 40) 18%, transparent)",
          }}
        >
          <div className="grid grid-cols-2 max-h-[360px]">
            <div className="border-r overflow-y-auto" style={{ borderRightColor: "var(--vet-border)" }}>
              <p
                className="text-[10px] font-extrabold uppercase tracking-[1px] px-4 pt-3 pb-1.5"
                style={{ color: "var(--vet-text-3)" }}
              >
                Meses
              </p>
              <SelectRow
                label="Todos los meses"
                active={draftMonths === "all"}
                onClick={() => setDraftMonths("all")}
              />
              {MONTH_NAMES.map((name, idx) => {
                const active = draftMonths !== "all" && draftMonths.has(idx);
                return (
                  <SelectRow
                    key={idx}
                    label={name}
                    active={active}
                    onClick={() => toggleMonth(idx)}
                  />
                );
              })}
            </div>
            <div className="overflow-y-auto">
              <p
                className="text-[10px] font-extrabold uppercase tracking-[1px] px-4 pt-3 pb-1.5"
                style={{ color: "var(--vet-text-3)" }}
              >
                Años
              </p>
              <SelectRow
                label="Todos los años"
                active={draftYears === "all"}
                onClick={() => setDraftYears("all")}
              />
              {availableYears.map((y) => {
                const active = draftYears !== "all" && draftYears.has(y);
                return (
                  <SelectRow
                    key={y}
                    label={String(y)}
                    active={active}
                    onClick={() => toggleYear(y)}
                  />
                );
              })}
            </div>
          </div>
          <div
            className="flex gap-2 p-2.5 border-t"
            style={{
              borderTopColor: "var(--vet-border)",
              background: "var(--vet-bg-mid)",
            }}
          >
            <button
              type="button"
              onClick={resetHandler}
              className="flex-1 h-10 rounded-[10px] border text-[13px] font-extrabold transition-colors"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-2)",
              }}
            >
              Restablecer
            </button>
            <button
              type="button"
              onClick={applyHandler}
              className="flex-[1.4] h-10 rounded-[10px] text-[13px] font-extrabold text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
                boxShadow: "0 4px 12px var(--vet-green-glow)",
              }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-2 text-[13px] font-bold transition-colors text-left"
      style={{
        background: active ? "var(--vet-green-glow)" : "transparent",
        color: active ? "var(--vet-green)" : "var(--vet-text-1)",
      }}
    >
      <span>{label}</span>
      {active && <span className="text-[12px]">✓</span>}
    </button>
  );
}

/* ─── Vet Picker ──────────────────────────────────────── */

function VetPicker({
  vets,
  selected,
  onChange,
}: {
  vets: Vet[];
  selected: Selection<string>;
  onChange: (sel: Selection<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const allActive = selected === "all";
  const count = allActive ? vets.length : selected.size;

  function toggleVet(id: string) {
    if (allActive) {
      // start with just this one
      onChange(new Set([id]));
      return;
    }
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next.size === 0 ? "all" : next);
  }

  function selectAll() {
    onChange("all");
  }

  const label = allActive
    ? "Todos los veterinarios"
    : count === 1
    ? vets.find((v) => (selected as ReadonlySet<string>).has(v.id))?.name ?? "1 vet"
    : `${count} veterinarios`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3.5 h-10 rounded-[10px] border text-[13px] font-extrabold transition-colors max-w-[260px]"
        style={{
          background: open ? "var(--vet-bg-mid)" : "var(--vet-bg-card)",
          borderColor: open ? "var(--vet-green)" : "var(--vet-border)",
          color: open ? "var(--vet-green)" : "var(--vet-text-1)",
        }}
        aria-expanded={open}
      >
        <User size={14} />
        <span className="truncate">{label}</span>
        <ChevronDown
          size={14}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform .15s",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+6px)] right-0 z-30 w-[260px] max-w-[calc(100vw-32px)] rounded-[14px] border overflow-hidden"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            boxShadow:
              "0 18px 48px color-mix(in oklab, oklch(20% 0.04 40) 18%, transparent)",
          }}
        >
          <p
            className="text-[10px] font-extrabold uppercase tracking-[1px] px-4 pt-3 pb-1.5"
            style={{ color: "var(--vet-text-3)" }}
          >
            Veterinarios
          </p>
          <div className="max-h-[320px] overflow-y-auto">
            <SelectRow
              label="Todos"
              active={allActive}
              onClick={selectAll}
            />
            {vets.map((v) => {
              const active = !allActive && selected.has(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVet(v.id)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[13px] font-bold transition-colors text-left"
                  style={{
                    background: active
                      ? "var(--vet-green-glow)"
                      : "transparent",
                    color: active ? "var(--vet-green)" : "var(--vet-text-1)",
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0"
                    style={{
                      background: v.photoUrl
                        ? "var(--vet-bg-mid)"
                        : "linear-gradient(135deg, var(--vet-violet), oklch(38% 0.18 280))",
                    }}
                  >
                    {v.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.photoUrl}
                        alt={v.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>
                        {v.name
                          .split(" ")
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() ?? "")
                          .join("")}
                      </span>
                    )}
                  </div>
                  <span className="flex-1 truncate">{v.name}</span>
                  {active && <span className="text-[12px]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Charts Grid (when no KPI is active) ─────────────── */

function ChartsGrid({
  filtered,
  months,
  years,
  vets,
}: {
  filtered: Appointment[];
  months: Selection<number>;
  years: Selection<number>;
  vets: Vet[];
}) {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <ChartCard title="Tendencia">
        <TrendChart filtered={filtered} months={months} years={years} />
      </ChartCard>
      <ChartCard title="Top 5 clientes por visitas">
        <TopClientsChart filtered={filtered} />
      </ChartCard>
      <ChartCard title="Distribución por servicio">
        <ServiceDistribution filtered={filtered} />
      </ChartCard>
      <ChartCard title="Por veterinario">
        <PerVetChart filtered={filtered} vets={vets} />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="border p-5 rounded-[18px] flex flex-col gap-4"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        minHeight: 280,
      }}
    >
      <h3
        className="text-[11px] font-extrabold uppercase tracking-[1.2px]"
        style={{ color: "var(--vet-text-3)" }}
      >
        {title}
      </h3>
      <div className="flex-1 flex flex-col">{children}</div>
    </section>
  );
}

/* Trend chart — daily if 1 month + 1 year, monthly if 1 year, yearly otherwise */

function TrendChart({
  filtered,
  months,
  years,
}: {
  filtered: Appointment[];
  months: Selection<number>;
  years: Selection<number>;
}) {
  type Mode = "day" | "month" | "year";
  const mode: Mode =
    months !== "all" &&
    years !== "all" &&
    months.size === 1 &&
    years.size === 1
      ? "day"
      : years !== "all" && years.size === 1
      ? "month"
      : "year";

  let buckets: { label: string; visits: number; revenue: number }[] = [];

  if (mode === "day") {
    const m = [...(months as ReadonlySet<number>)][0];
    const y = [...(years as ReadonlySet<number>)][0];
    const days = new Date(y, m + 1, 0).getDate();
    buckets = Array.from({ length: days }, (_, i) => ({
      label: String(i + 1),
      visits: 0,
      revenue: 0,
    }));
    for (const a of filtered) {
      if (a.status !== "COMPLETED") continue;
      const d = new Date(a.date);
      const idx = d.getDate() - 1;
      buckets[idx].visits++;
      buckets[idx].revenue += a.priceEstimate;
    }
  } else if (mode === "month") {
    buckets = Array.from({ length: 12 }, (_, i) => ({
      label: MONTH_NAMES_SHORT[i],
      visits: 0,
      revenue: 0,
    }));
    for (const a of filtered) {
      if (a.status !== "COMPLETED") continue;
      const d = new Date(a.date);
      const idx = d.getMonth();
      buckets[idx].visits++;
      buckets[idx].revenue += a.priceEstimate;
    }
  } else {
    const yMap = new Map<number, { visits: number; revenue: number }>();
    for (const a of filtered) {
      if (a.status !== "COMPLETED") continue;
      const d = new Date(a.date);
      const cur = yMap.get(d.getFullYear()) ?? { visits: 0, revenue: 0 };
      cur.visits++;
      cur.revenue += a.priceEstimate;
      yMap.set(d.getFullYear(), cur);
    }
    buckets = [...yMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([y, v]) => ({ label: String(y), ...v }));
    if (buckets.length === 0)
      buckets = [{ label: "—", visits: 0, revenue: 0 }];
  }

  const max = Math.max(1, ...buckets.map((b) => b.visits));
  const maxRev = Math.max(1, ...buckets.map((b) => b.revenue));

  // SVG dimensions
  const w = 100;
  const h = 100;
  const pointsVisits = buckets.map((b, i) => {
    const x = (i / Math.max(1, buckets.length - 1)) * w;
    const y = h - (b.visits / max) * h;
    return `${x},${y}`;
  });
  const pointsRevenue = buckets.map((b, i) => {
    const x = (i / Math.max(1, buckets.length - 1)) * w;
    const y = h - (b.revenue / maxRev) * h;
    return `${x},${y}`;
  });

  // Show small label only on a few x ticks if many buckets
  const showEvery = buckets.length > 14 ? Math.ceil(buckets.length / 8) : 1;

  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex items-center gap-3 text-[11px] font-bold">
        <span className="inline-flex items-center gap-1.5" style={{ color: "var(--vet-text-2)" }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--vet-green)" }} />
          Citas atendidas
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: "var(--vet-text-2)" }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--vet-blue-dim)" }} />
          Ingresos
        </span>
      </div>
      <div className="relative flex-1 min-h-[180px]">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1={0}
              x2={w}
              y1={h * p}
              y2={h * p}
              stroke="var(--vet-border)"
              strokeWidth={0.25}
              strokeDasharray="0.5,1"
            />
          ))}
          {/* Lines */}
          <polyline
            fill="none"
            stroke="var(--vet-blue-dim)"
            strokeWidth={1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            points={pointsRevenue.join(" ")}
          />
          <polyline
            fill="none"
            stroke="var(--vet-green)"
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            points={pointsVisits.join(" ")}
          />
          {/* Dots on visits */}
          {buckets.map((b, i) => {
            const x = (i / Math.max(1, buckets.length - 1)) * w;
            const y = h - (b.visits / max) * h;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={1.2}
                fill="var(--vet-green)"
                stroke="var(--vet-bg-card)"
                strokeWidth={0.4}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[9px] font-bold pt-1" style={{ color: "var(--vet-text-3)" }}>
        {buckets.map((b, i) => (
          <span key={i} className="text-center">
            {i % showEvery === 0 || i === buckets.length - 1 ? b.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Top clients horizontal bars */

function TopClientsChart({ filtered }: { filtered: Appointment[] }) {
  const map = new Map<string, number>();
  for (const a of filtered) {
    if (a.status !== "COMPLETED") continue;
    map.set(a.clientName, (map.get(a.clientName) ?? 0) + 1);
  }
  const top = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (top.length === 0) return <EmptyChart />;
  const max = top[0][1];
  return (
    <div className="flex flex-col gap-2.5 flex-1 justify-center">
      {top.map(([name, count]) => (
        <div key={name} className="flex items-center gap-2">
          <div
            className="w-28 truncate text-[12px] font-extrabold text-right"
            style={{ color: "var(--vet-text-1)" }}
            title={name}
          >
            {name}
          </div>
          <div
            className="flex-1 h-6 rounded-[6px] relative overflow-hidden"
            style={{ background: "var(--vet-bg-hover)" }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-[6px]"
              style={{
                width: `${(count / max) * 100}%`,
                background:
                  "linear-gradient(90deg, var(--vet-amber), oklch(58% 0.16 45))",
              }}
            />
          </div>
          <div
            className="w-8 text-right vet-mono text-[13px] font-extrabold"
            style={{ color: "var(--vet-amber)" }}
          >
            {count}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Service distribution donut */

function ServiceDistribution({ filtered }: { filtered: Appointment[] }) {
  const map = new Map<string, number>();
  for (const a of filtered) {
    if (a.status !== "COMPLETED") continue;
    map.set(a.serviceName, (map.get(a.serviceName) ?? 0) + 1);
  }
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((acc, [, v]) => acc + v, 0);
  if (total === 0) return <EmptyChart />;

  const palette = [
    "var(--vet-green)",
    "var(--vet-blue-dim)",
    "var(--vet-violet)",
    "var(--vet-amber)",
    "var(--vet-red)",
    "oklch(56% 0.12 200)",
    "oklch(60% 0.14 280)",
  ];

  // Donut
  const r = 38;
  const cx = 50;
  const cy = 50;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5 flex-1 min-h-[180px]">
      <svg viewBox="0 0 100 100" className="w-[140px] h-[140px] shrink-0">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--vet-bg-hover)"
          strokeWidth={12}
        />
        {entries.map(([name, v], i) => {
          const portion = v / total;
          const dash = portion * c;
          const seg = (
            <circle
              key={name}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={palette[i % palette.length]}
              strokeWidth={12}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return seg;
        })}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="vet-mono"
          style={{ fontSize: 14, fontWeight: 800, fill: "var(--vet-text-1)" }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 9}
          textAnchor="middle"
          style={{ fontSize: 5, fontWeight: 800, fill: "var(--vet-text-3)" }}
        >
          CITAS
        </text>
      </svg>
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {entries.slice(0, 6).map(([name, v], i) => (
          <div key={name} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: palette[i % palette.length] }}
            />
            <span
              className="text-[12px] font-bold truncate flex-1"
              style={{ color: "var(--vet-text-1)" }}
              title={name}
            >
              {name}
            </span>
            <span
              className="vet-mono text-[12px] font-extrabold"
              style={{ color: "var(--vet-text-2)" }}
            >
              {v}
            </span>
            <span
              className="text-[10px] font-bold w-9 text-right"
              style={{ color: "var(--vet-text-3)" }}
            >
              {Math.round((v / total) * 100)}%
            </span>
          </div>
        ))}
        {entries.length > 6 && (
          <p
            className="text-[10px] font-bold mt-1"
            style={{ color: "var(--vet-text-3)" }}
          >
            +{entries.length - 6} servicios más
          </p>
        )}
      </div>
    </div>
  );
}

/* Per vet horizontal bars */

function PerVetChart({
  filtered,
  vets,
}: {
  filtered: Appointment[];
  vets: Vet[];
}) {
  const map = new Map<string, { name: string; completed: number; revenue: number }>();
  for (const v of vets)
    map.set(v.id, { name: v.name, completed: 0, revenue: 0 });
  for (const a of filtered) {
    const cur = map.get(a.vetId) ?? {
      name: a.vetName,
      completed: 0,
      revenue: 0,
    };
    if (a.status === "COMPLETED") {
      cur.completed++;
      cur.revenue += a.priceEstimate;
    }
    map.set(a.vetId, cur);
  }
  const rows = [...map.values()].sort((a, b) => b.completed - a.completed);
  const max = Math.max(1, ...rows.map((r) => r.completed));
  if (rows.every((r) => r.completed === 0)) return <EmptyChart />;
  return (
    <div className="flex flex-col gap-2.5 flex-1 justify-center">
      {rows.slice(0, 6).map((r) => (
        <div key={r.name} className="flex items-center gap-2">
          <div
            className="w-28 truncate text-[12px] font-extrabold text-right"
            style={{ color: "var(--vet-text-1)" }}
            title={r.name}
          >
            {r.name}
          </div>
          <div
            className="flex-1 h-6 rounded-[6px] relative overflow-hidden"
            style={{ background: "var(--vet-bg-hover)" }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-[6px]"
              style={{
                width: `${(r.completed / max) * 100}%`,
                background:
                  "linear-gradient(90deg, var(--vet-green), var(--vet-green-dim))",
              }}
            />
          </div>
          <div
            className="w-8 text-right vet-mono text-[13px] font-extrabold"
            style={{ color: "var(--vet-green)" }}
          >
            {r.completed}
          </div>
        </div>
      ))}
      {rows.length > 6 && (
        <p
          className="text-[10px] font-bold mt-1"
          style={{ color: "var(--vet-text-3)" }}
        >
          +{rows.length - 6} veterinarios más
        </p>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div
      className="flex-1 flex items-center justify-center text-[12px] font-semibold"
      style={{ color: "var(--vet-text-3)" }}
    >
      Sin datos para el periodo seleccionado.
    </div>
  );
}

/* ─── KPI Detail (replaces charts grid) ───────────────── */

function KpiDetail({
  kpi,
  filtered,
  onBack,
}: {
  kpi: KpiKey;
  filtered: Appointment[];
  onBack: () => void;
}) {
  return (
    <section
      className="border rounded-[20px] overflow-hidden"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <div
        className="px-5 py-4 border-b flex items-center gap-3 flex-wrap"
        style={{ borderBottomColor: "var(--vet-border)" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] border text-[12px] font-extrabold transition-colors"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-2)",
          }}
        >
          <ChevronLeft size={14} />
          Volver a gráficas
        </button>
        <h2
          className="font-extrabold text-[15px]"
          style={{ color: "var(--vet-text-1)" }}
        >
          {kpi === "completed" && "Detalle de citas atendidas"}
          {kpi === "revenue" && "Detalle de ingresos"}
          {kpi === "topService" && "Ranking de servicios"}
          {kpi === "topClient" && "Ranking de clientes"}
        </h2>
      </div>
      <div className="overflow-x-auto">
        {kpi === "completed" && <CompletedTable filtered={filtered} />}
        {kpi === "revenue" && <RevenueTable filtered={filtered} />}
        {kpi === "topService" && <ServiceRankingTable filtered={filtered} />}
        {kpi === "topClient" && <ClientRankingTable filtered={filtered} />}
      </div>
    </section>
  );
}

function CompletedTable({ filtered }: { filtered: Appointment[] }) {
  const rows = filtered
    .filter((a) => a.status === "COMPLETED")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (rows.length === 0) return <EmptyTable label="Sin citas atendidas en el periodo." />;
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ background: "var(--vet-bg-mid)" }}>
          <Th align="left">#</Th>
          <Th align="left">Fecha</Th>
          <Th align="left">Veterinario</Th>
          <Th align="left">Cliente</Th>
          <Th align="left">Mascota</Th>
          <Th align="left">Servicio</Th>
          <Th align="right">Precio</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a, idx) => {
          const d = new Date(a.date);
          return (
            <tr
              key={a.id}
              style={{ borderTop: "1px solid var(--vet-border)" }}
            >
              <Td muted>{idx + 1}</Td>
              <Td muted className="vet-mono whitespace-nowrap">
                {formatDateShort(d)} {formatTime(d)}
              </Td>
              <Td strong>{a.vetName}</Td>
              <Td>{a.clientName}</Td>
              <Td>{a.petName}</Td>
              <Td>{a.serviceName}</Td>
              <Td align="right" className="vet-mono" strong>
                {formatMxn(a.priceEstimate)}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RevenueTable({ filtered }: { filtered: Appointment[] }) {
  // Group by service for revenue breakdown + show rows
  const rows = filtered
    .filter((a) => a.status === "COMPLETED")
    .sort((a, b) => b.priceEstimate - a.priceEstimate);
  if (rows.length === 0)
    return <EmptyTable label="Aún no hay ingresos en el periodo." />;
  const total = rows.reduce((acc, a) => acc + a.priceEstimate, 0);
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ background: "var(--vet-bg-mid)" }}>
          <Th align="left">#</Th>
          <Th align="left">Fecha</Th>
          <Th align="left">Cliente</Th>
          <Th align="left">Servicio</Th>
          <Th align="left">Veterinario</Th>
          <Th align="right">Cobro</Th>
          <Th align="right">% del total</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a, idx) => {
          const d = new Date(a.date);
          return (
            <tr
              key={a.id}
              style={{ borderTop: "1px solid var(--vet-border)" }}
            >
              <Td muted>{idx + 1}</Td>
              <Td muted className="vet-mono whitespace-nowrap">
                {formatDateShort(d)}
              </Td>
              <Td strong>{a.clientName}</Td>
              <Td>{a.serviceName}</Td>
              <Td>{a.vetName}</Td>
              <Td align="right" className="vet-mono" strong>
                {formatMxn(a.priceEstimate)}
              </Td>
              <Td align="right" className="vet-mono" muted>
                {((a.priceEstimate / total) * 100).toFixed(1)}%
              </Td>
            </tr>
          );
        })}
        <tr
          style={{
            borderTop: "2px solid var(--vet-border)",
            background: "var(--vet-bg-mid)",
          }}
        >
          <Td muted>—</Td>
          <Td colSpan={4} strong>
            Total
          </Td>
          <Td
            align="right"
            className="vet-mono"
            style={{ color: "var(--vet-blue-dim)" }}
            strong
          >
            {formatMxn(total)}
          </Td>
          <Td muted>—</Td>
        </tr>
      </tbody>
    </table>
  );
}

function ServiceRankingTable({ filtered }: { filtered: Appointment[] }) {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const a of filtered) {
    if (a.status !== "COMPLETED") continue;
    const cur = map.get(a.serviceName) ?? { count: 0, revenue: 0 };
    cur.count++;
    cur.revenue += a.priceEstimate;
    map.set(a.serviceName, cur);
  }
  const rows = [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  if (rows.length === 0)
    return <EmptyTable label="Sin servicios atendidos en el periodo." />;
  const totalCount = rows.reduce((acc, [, v]) => acc + v.count, 0);
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ background: "var(--vet-bg-mid)" }}>
          <Th align="left">#</Th>
          <Th align="left">Servicio</Th>
          <Th align="right">Citas</Th>
          <Th align="right">% del total</Th>
          <Th align="right">Ingresos</Th>
          <Th align="right">Promedio</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, v], idx) => (
          <tr key={name} style={{ borderTop: "1px solid var(--vet-border)" }}>
            <Td muted>{idx + 1}</Td>
            <Td strong>{name}</Td>
            <Td
              align="right"
              className="vet-mono"
              strong
              style={{ color: "var(--vet-violet)" }}
            >
              {v.count}
            </Td>
            <Td align="right" className="vet-mono" muted>
              {((v.count / totalCount) * 100).toFixed(1)}%
            </Td>
            <Td align="right" className="vet-mono" strong>
              {formatMxn(v.revenue)}
            </Td>
            <Td align="right" className="vet-mono" muted>
              {formatMxn(Math.round(v.revenue / v.count))}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClientRankingTable({ filtered }: { filtered: Appointment[] }) {
  const map = new Map<
    string,
    {
      name: string;
      visits: number;
      revenue: number;
      pets: Set<string>;
      lastDate: string | null;
      vetCounts: Map<string, number>;
    }
  >();
  for (const a of filtered) {
    if (a.status !== "COMPLETED") continue;
    const cur =
      map.get(a.clientId) ?? {
        name: a.clientName,
        visits: 0,
        revenue: 0,
        pets: new Set<string>(),
        lastDate: null,
        vetCounts: new Map<string, number>(),
      };
    cur.visits++;
    cur.revenue += a.priceEstimate;
    cur.pets.add(a.petName);
    cur.vetCounts.set(a.vetName, (cur.vetCounts.get(a.vetName) ?? 0) + 1);
    if (!cur.lastDate || a.date > cur.lastDate) cur.lastDate = a.date;
    map.set(a.clientId, cur);
  }
  const rows = [...map.values()].sort((a, b) => b.visits - a.visits);
  if (rows.length === 0)
    return <EmptyTable label="Sin clientes con visitas en el periodo." />;
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ background: "var(--vet-bg-mid)" }}>
          <Th align="left">#</Th>
          <Th align="left">Cliente</Th>
          <Th align="right">Visitas</Th>
          <Th align="right">Mascotas</Th>
          <Th align="left">Vet más visitado</Th>
          <Th align="right">Total gastado</Th>
          <Th align="right">Última visita</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c, idx) => {
          const topVet = [...c.vetCounts.entries()].sort(
            (a, b) => b[1] - a[1]
          )[0];
          return (
            <tr key={c.name} style={{ borderTop: "1px solid var(--vet-border)" }}>
              <Td muted>{idx + 1}</Td>
              <Td strong>{c.name}</Td>
              <Td
                align="right"
                className="vet-mono"
                strong
                style={{ color: "var(--vet-amber)" }}
              >
                {c.visits}
              </Td>
              <Td align="right" className="vet-mono">
                {c.pets.size}
              </Td>
              <Td>
                {topVet ? `${topVet[0]} (${topVet[1]})` : "—"}
              </Td>
              <Td align="right" className="vet-mono" strong>
                {formatMxn(c.revenue)}
              </Td>
              <Td align="right" className="vet-mono" muted>
                {c.lastDate ? formatDateShort(new Date(c.lastDate)) : "—"}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      }`}
      style={{ color: "var(--vet-text-3)" }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  strong,
  muted,
  className,
  style,
  colSpan,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  strong?: boolean;
  muted?: boolean;
  className?: string;
  style?: React.CSSProperties;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-4 py-2.5 ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}
      style={{
        color: muted
          ? "var(--vet-text-3)"
          : strong
          ? "var(--vet-text-1)"
          : "var(--vet-text-2)",
        fontWeight: strong ? 800 : 600,
        ...style,
      }}
    >
      {children}
    </td>
  );
}

function EmptyTable({ label }: { label: string }) {
  return (
    <div
      className="px-5 py-12 text-center text-[13px] font-semibold"
      style={{ color: "var(--vet-text-3)" }}
    >
      {label}
    </div>
  );
}
