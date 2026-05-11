"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Download,
  Heart,
  Maximize2,
  Sparkles,
  User,
  Wallet,
  X,
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

type ExportTable = "appointments" | "revenue" | "clients" | "vets" | "services" | "all";

const TABLE_LABELS: Record<ExportTable, string> = {
  appointments: "Citas",
  revenue: "Ingresos",
  clients: "Clientes",
  vets: "Veterinarios",
  services: "Servicios",
  all: "Todas las tablas",
};

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

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
  adminName: string;
  appointments: Appointment[];
  vets: Vet[];
  clients: Client[];
};

export function AdminReportsClient({
  adminName,
  appointments,
  vets,
  clients,
}: Props) {
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();

  const [months, setMonths] = useState<Selection<number>>(
    new Set([todayMonth])
  );
  const [years, setYears] = useState<Selection<number>>(new Set([todayYear]));
  const [vetSel, setVetSel] = useState<Selection<string>>("all");
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

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

  function runExport(table: ExportTable) {
    const vetsLabel =
      vetSel === "all"
        ? "Todos"
        : [...vetSel]
            .map((id) => vets.find((v) => v.id === id)?.name)
            .filter(Boolean)
            .join(", ") || "Ninguno";
    const meta: string[][] = [
      ["Reporte Vetsfriend"],
      ["Generado", formatDateTime(new Date())],
      ["Generado por", adminName],
      ["Rango de fechas", periodLabel(months, years)],
      ["Veterinarios", vetsLabel],
      [
        "Citas en el rango",
        `${filtered.length} (${stats.completed} atendidas, ${stats.scheduled} pendientes, ${stats.cancelled} canceladas)`,
      ],
      [
        "Tabla exportada",
        TABLE_LABELS[table],
      ],
      [],
    ];

    const sections: string[][] = [];

    if (table === "appointments" || table === "all") {
      sections.push(
        ["CITAS"],
        [
          "Fecha",
          "Hora",
          "Estado",
          "Veterinario",
          "Cliente",
          "Mascota",
          "Servicio",
          "Precio",
        ],
        ...filtered.map((a) => {
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
        }),
        []
      );
    }

    if (table === "revenue" || table === "all") {
      const completedRows = filtered.filter((a) => a.status === "COMPLETED");
      const totalRevenue = completedRows.reduce(
        (acc, a) => acc + a.priceEstimate,
        0
      );
      sections.push(
        ["INGRESOS (citas atendidas)"],
        ["Fecha", "Cliente", "Servicio", "Veterinario", "Cobro"],
        ...completedRows.map((a) => {
          const d = new Date(a.date);
          return [
            new Intl.DateTimeFormat("es-MX", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(d),
            a.clientName,
            a.serviceName,
            a.vetName,
            a.priceEstimate.toString(),
          ];
        }),
        ["", "", "", "TOTAL", totalRevenue.toString()],
        []
      );
    }

    if (table === "clients" || table === "all") {
      const map = new Map<
        string,
        { name: string; visits: number; revenue: number; lastDate: string | null }
      >();
      for (const a of filtered) {
        if (a.status !== "COMPLETED") continue;
        const cur =
          map.get(a.clientId) ?? {
            name: a.clientName,
            visits: 0,
            revenue: 0,
            lastDate: null,
          };
        cur.visits++;
        cur.revenue += a.priceEstimate;
        if (!cur.lastDate || a.date > cur.lastDate) cur.lastDate = a.date;
        map.set(a.clientId, cur);
      }
      const rows = [...map.values()].sort((a, b) => b.visits - a.visits);
      sections.push(
        ["CLIENTES"],
        ["Cliente", "Visitas", "Ingresos", "Última visita"],
        ...rows.map((c) => [
          c.name,
          String(c.visits),
          c.revenue.toString(),
          c.lastDate
            ? new Intl.DateTimeFormat("es-MX", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(c.lastDate))
            : "",
        ]),
        []
      );
    }

    if (table === "vets" || table === "all") {
      const map = new Map<
        string,
        {
          name: string;
          total: number;
          completed: number;
          cancelled: number;
          revenue: number;
        }
      >();
      for (const v of vets)
        map.set(v.id, {
          name: v.name,
          total: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
        });
      for (const a of filtered) {
        const cur =
          map.get(a.vetId) ?? {
            name: a.vetName,
            total: 0,
            completed: 0,
            cancelled: 0,
            revenue: 0,
          };
        cur.total++;
        if (a.status === "COMPLETED") {
          cur.completed++;
          cur.revenue += a.priceEstimate;
        }
        if (a.status === "CANCELLED" || a.status === "NO_SHOW")
          cur.cancelled++;
        map.set(a.vetId, cur);
      }
      const rows = [...map.values()]
        .filter((r) => r.total > 0)
        .sort((a, b) => b.completed - a.completed);
      sections.push(
        ["VETERINARIOS"],
        [
          "Veterinario",
          "Citas",
          "Atendidas",
          "Canceladas",
          "Ingresos",
          "Asistencia %",
        ],
        ...rows.map((r) => [
          r.name,
          String(r.total),
          String(r.completed),
          String(r.cancelled),
          r.revenue.toString(),
          r.total > 0
            ? `${Math.round((r.completed / r.total) * 100)}%`
            : "0%",
        ]),
        []
      );
    }

    if (table === "services" || table === "all") {
      const map = new Map<string, { count: number; revenue: number }>();
      for (const a of filtered) {
        if (a.status !== "COMPLETED") continue;
        const cur = map.get(a.serviceName) ?? { count: 0, revenue: 0 };
        cur.count++;
        cur.revenue += a.priceEstimate;
        map.set(a.serviceName, cur);
      }
      const rows = [...map.entries()].sort((a, b) => b[1].count - a[1].count);
      const totalCount = rows.reduce((acc, [, v]) => acc + v.count, 0);
      sections.push(
        ["SERVICIOS"],
        [
          "Servicio",
          "Citas atendidas",
          "% del total",
          "Ingresos",
          "Promedio",
        ],
        ...rows.map(([name, v]) => [
          name,
          String(v.count),
          totalCount > 0
            ? `${((v.count / totalCount) * 100).toFixed(1)}%`
            : "0%",
          v.revenue.toString(),
          v.count > 0
            ? Math.round(v.revenue / v.count).toString()
            : "0",
        ]),
        []
      );
    }

    const all = [...meta, ...sections];
    const csv = all
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-vetsfriend-${table}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportOpen(false);
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
            onClick={() => setExportOpen(true)}
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
          availableYears={availableYears}
          vets={vets}
        />
      )}

      {exportOpen && (
        <ExportModal
          adminName={adminName}
          periodLabelStr={periodLabel(months, years)}
          vetCount={selectionSize(vetSel, vets.length)}
          totalVets={vets.length}
          counts={{
            total: filtered.length,
            completed: stats.completed,
            scheduled: stats.scheduled,
            cancelled: stats.cancelled,
          }}
          onCancel={() => setExportOpen(false)}
          onConfirm={runExport}
        />
      )}
    </div>
  );
}

function ExportModal({
  adminName,
  periodLabelStr,
  vetCount,
  totalVets,
  counts,
  onCancel,
  onConfirm,
}: {
  adminName: string;
  periodLabelStr: string;
  vetCount: number;
  totalVets: number;
  counts: {
    total: number;
    completed: number;
    scheduled: number;
    cancelled: number;
  };
  onCancel: () => void;
  onConfirm: (table: ExportTable) => void;
}) {
  const [table, setTable] = useState<ExportTable>("all");

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handle);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = prev;
    };
  }, [onCancel]);

  const options: { key: ExportTable; label: string; desc: string }[] = [
    {
      key: "all",
      label: "Todo",
      desc: "Citas + ingresos + clientes + veterinarios + servicios en un solo archivo.",
    },
    {
      key: "appointments",
      label: "Citas",
      desc: "Una fila por cita con fecha, vet, cliente, mascota y servicio.",
    },
    {
      key: "revenue",
      label: "Ingresos",
      desc: "Sólo citas atendidas con su cobro, ordenadas por fecha, con total.",
    },
    {
      key: "clients",
      label: "Clientes",
      desc: "Ranking de clientes con visitas, ingresos y última visita.",
    },
    {
      key: "vets",
      label: "Veterinarios",
      desc: "Rendimiento por veterinario (atendidas, ingresos, asistencia %).",
    },
    {
      key: "services",
      label: "Servicios",
      desc: "Servicios más vendidos con % del total e ingresos.",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      onClick={onCancel}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "color-mix(in oklab, oklch(18% 0.04 40) 60%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] max-h-[92vh] flex flex-col rounded-[22px] border overflow-hidden"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          boxShadow:
            "0 30px 80px color-mix(in oklab, oklch(15% 0.05 40) 40%, transparent)",
        }}
      >
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 border-b"
          style={{
            borderBottomColor: "var(--vet-border)",
            background: "var(--vet-bg-mid)",
          }}
        >
          <div className="min-w-0">
            <h2
              className="text-[17px] font-black"
              style={{ color: "var(--vet-text-1)" }}
            >
              Exportar reporte
            </h2>
            <p
              className="text-[12px] font-semibold mt-0.5"
              style={{ color: "var(--vet-text-3)" }}
            >
              Elige qué tabla quieres descargar. El archivo incluye una
              cabecera con la fecha, quién lo generó y el rango aplicado.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-[10px] border flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 sm:p-6 flex flex-col gap-4">
          {/* Context summary */}
          <div
            className="rounded-[12px] p-3 flex flex-col gap-1 border"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
            }}
          >
            <p
              className="text-[10px] font-extrabold uppercase tracking-wider"
              style={{ color: "var(--vet-text-3)" }}
            >
              Cabecera del archivo
            </p>
            <SummaryRow label="Generado" value={formatDateTime(new Date())} />
            <SummaryRow label="Por" value={adminName} />
            <SummaryRow label="Rango de fechas" value={periodLabelStr} />
            <SummaryRow
              label="Veterinarios"
              value={
                vetCount === totalVets ? "Todos" : `${vetCount}/${totalVets}`
              }
            />
            <SummaryRow
              label="Citas en el rango"
              value={`${counts.total} (${counts.completed} atendidas)`}
            />
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2">
            <p
              className="text-[10px] font-extrabold uppercase tracking-wider"
              style={{ color: "var(--vet-text-3)" }}
            >
              Tabla a exportar
            </p>
            {options.map((opt) => {
              const active = table === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTable(opt.key)}
                  className="flex items-center gap-3 p-3.5 rounded-[12px] border text-left transition-colors"
                  style={{
                    background: active
                      ? "var(--vet-green-glow)"
                      : "var(--vet-bg-mid)",
                    borderColor: active
                      ? "var(--vet-green)"
                      : "var(--vet-border)",
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: active
                        ? "var(--vet-green)"
                        : "var(--vet-text-3)",
                      background: active ? "var(--vet-green)" : "transparent",
                    }}
                  >
                    {active && (
                      <span
                        className="w-2 h-2 rounded-full bg-white"
                        aria-hidden
                      />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-extrabold"
                      style={{
                        color: active
                          ? "var(--vet-green)"
                          : "var(--vet-text-1)",
                      }}
                    >
                      {opt.label}
                    </p>
                    <p
                      className="text-[12px] font-semibold"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      {opt.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3 border-t"
          style={{
            borderTopColor: "var(--vet-border)",
            background: "var(--vet-bg-mid)",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-[10px] border text-[13px] font-extrabold"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(table)}
            className="h-10 px-5 rounded-[10px] text-[13px] font-extrabold text-white inline-flex items-center gap-1.5"
            style={{
              background:
                "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
              boxShadow: "0 4px 12px var(--vet-green-glow)",
            }}
          >
            <Download size={14} /> Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span
        className="font-extrabold uppercase tracking-wider text-[10px] w-28"
        style={{ color: "var(--vet-text-3)" }}
      >
        {label}
      </span>
      <span
        className="font-bold truncate flex-1"
        style={{ color: "var(--vet-text-1)" }}
      >
        {value}
      </span>
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

type ChartKey = "trend" | "clients" | "services" | "vets";

function ChartsGrid({
  filtered,
  months,
  years,
  availableYears,
  vets,
}: {
  filtered: Appointment[];
  months: Selection<number>;
  years: Selection<number>;
  availableYears: number[];
  vets: Vet[];
}) {
  const [expanded, setExpanded] = useState<ChartKey | null>(null);

  const charts: {
    key: ChartKey;
    title: string;
    subtitle: string;
    render: (size: "card" | "modal") => React.ReactNode;
  }[] = [
    {
      key: "trend",
      title: "Tendencia de ingresos",
      subtitle: trendSubtitle(months, years),
      render: (size) => (
        <TrendChart
          filtered={filtered}
          months={months}
          years={years}
          availableYears={availableYears}
          size={size}
        />
      ),
    },
    {
      key: "clients",
      title: "Top clientes por visitas",
      subtitle: "Clientes que más veces nos han visitado en el periodo.",
      render: (size) => <TopClientsChart filtered={filtered} size={size} />,
    },
    {
      key: "services",
      title: "Distribución por servicio",
      subtitle: "Qué tipo de citas componen el periodo.",
      render: (size) => <ServiceDistribution filtered={filtered} size={size} />,
    },
    {
      key: "vets",
      title: "Por veterinario",
      subtitle: "Citas atendidas por cada doctor en el periodo.",
      render: (size) => <PerVetChart filtered={filtered} vets={vets} size={size} />,
    },
  ];

  const expandedChart = expanded
    ? charts.find((c) => c.key === expanded) ?? null
    : null;

  return (
    <>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {charts.map((c) => (
          <ChartCard
            key={c.key}
            title={c.title}
            onExpand={() => setExpanded(c.key)}
          >
            {c.render("card")}
          </ChartCard>
        ))}
      </div>
      {expandedChart && (
        <ChartModal
          title={expandedChart.title}
          subtitle={expandedChart.subtitle}
          onClose={() => setExpanded(null)}
        >
          {expandedChart.render("modal")}
        </ChartModal>
      )}
    </>
  );
}

function ChartCard({
  title,
  onExpand,
  children,
}: {
  title: string;
  onExpand: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className="relative border p-5 rounded-[18px] flex flex-col gap-4 cursor-pointer transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        minHeight: 280,
      }}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onExpand();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          className="text-[11px] font-extrabold uppercase tracking-[1.2px]"
          style={{ color: "var(--vet-text-3)" }}
        >
          {title}
        </h3>
        <span
          aria-hidden
          className="w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors"
          style={{
            background: "var(--vet-bg-mid)",
            border: "1px solid var(--vet-border)",
            color: "var(--vet-text-3)",
          }}
        >
          <Maximize2 size={12} strokeWidth={2.4} />
        </span>
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </section>
  );
}

function ChartModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handle);
    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "color-mix(in oklab, oklch(18% 0.04 40) 60%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1200px] max-h-[92vh] flex flex-col rounded-[22px] border overflow-hidden"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          boxShadow:
            "0 30px 80px color-mix(in oklab, oklch(15% 0.05 40) 40%, transparent)",
        }}
      >
        <div
          className="flex items-start justify-between gap-3 px-6 py-4 border-b"
          style={{
            borderBottomColor: "var(--vet-border)",
            background: "var(--vet-bg-mid)",
          }}
        >
          <div className="min-w-0">
            <h2
              className="text-[18px] font-black"
              style={{ color: "var(--vet-text-1)" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className="text-[12px] font-semibold mt-0.5"
                style={{ color: "var(--vet-text-3)" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors flex-shrink-0"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

function trendSubtitle(
  months: Selection<number>,
  years: Selection<number>
): string {
  if (
    months !== "all" &&
    years !== "all" &&
    months.size === 1 &&
    years.size === 1
  )
    return "Ingresos por semana del mes seleccionado.";
  if (years !== "all" && years.size === 1)
    return "Ingresos por mes del año seleccionado.";
  return "Ingresos por mes (o año si el rango es muy amplio).";
}

/* Trend chart — revenue bars. Bucketing adapts to the selected range:
 *  - 1 month + 1 year → weekly (4–5 bars).
 *  - 1 year (any month subset)        → monthly (≤12 bars).
 *  - Multiple years, month×year ≤ 36  → monthly with year suffix.
 *  - Wider                            → yearly (1 bar per year).
 */
function TrendChart({
  filtered,
  months,
  years,
  availableYears,
  size,
}: {
  filtered: Appointment[];
  months: Selection<number>;
  years: Selection<number>;
  availableYears: number[];
  size: "card" | "modal";
}) {
  const completed = filtered.filter((a) => a.status === "COMPLETED");

  const monthsList: number[] =
    months === "all"
      ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : [...months].sort((a, b) => a - b);
  const yearsList: number[] =
    years === "all"
      ? [...availableYears].sort((a, b) => a - b)
      : [...years].sort((a, b) => a - b);

  type Mode = "week" | "month" | "year";
  let mode: Mode = "month";
  if (monthsList.length === 1 && yearsList.length === 1) mode = "week";
  else if (yearsList.length * monthsList.length > 36) mode = "year";

  let buckets: { label: string; sublabel?: string; revenue: number }[] = [];

  if (mode === "week") {
    const m = monthsList[0];
    const y = yearsList[0];
    const lastDay = new Date(y, m + 1, 0).getDate();
    const numWeeks = Math.ceil(lastDay / 7);
    buckets = Array.from({ length: numWeeks }, (_, i) => {
      const start = i * 7 + 1;
      const end = Math.min(start + 6, lastDay);
      return {
        label: `Sem ${i + 1}`,
        sublabel: `${start}–${end}`,
        revenue: 0,
      };
    });
    for (const a of completed) {
      const d = new Date(a.date);
      const idx = Math.min(Math.floor((d.getDate() - 1) / 7), numWeeks - 1);
      buckets[idx].revenue += a.priceEstimate;
    }
  } else if (mode === "year") {
    buckets = yearsList.map((y) => ({ label: String(y), revenue: 0 }));
    const idxMap = new Map<number, number>();
    yearsList.forEach((y, i) => idxMap.set(y, i));
    for (const a of completed) {
      const y = new Date(a.date).getFullYear();
      const i = idxMap.get(y);
      if (i !== undefined) buckets[i].revenue += a.priceEstimate;
    }
  } else {
    // Monthly across one or more years
    const multipleYears = yearsList.length > 1;
    for (const y of yearsList) {
      for (const m of monthsList) {
        buckets.push({
          label: multipleYears
            ? `${MONTH_NAMES_SHORT[m]} ${String(y).slice(2)}`
            : MONTH_NAMES_SHORT[m],
          revenue: 0,
        });
      }
    }
    const idxMap = new Map<string, number>();
    let idx = 0;
    for (const y of yearsList) {
      for (const m of monthsList) {
        idxMap.set(`${y}-${m}`, idx++);
      }
    }
    for (const a of completed) {
      const d = new Date(a.date);
      const i = idxMap.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (i !== undefined) buckets[i].revenue += a.priceEstimate;
    }
  }

  // Fallback when there's nothing to bucket
  if (buckets.length === 0) {
    return <EmptyChart />;
  }

  const max = Math.max(1, ...buckets.map((b) => b.revenue));
  const totalRev = buckets.reduce((acc, b) => acc + b.revenue, 0);
  const winnerIdx = buckets.findIndex((b) => b.revenue === max && b.revenue > 0);

  const chartHeight = size === "modal" ? 420 : 200;

  // Tick labels — show every Nth to avoid overlap
  const labelShowEvery =
    buckets.length > 18 ? Math.ceil(buckets.length / 10) : 1;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span
            className="inline-flex items-center gap-1.5"
            style={{ color: "var(--vet-text-2)" }}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                background:
                  "linear-gradient(180deg, var(--vet-green), var(--vet-green-dim))",
              }}
            />
            Ingresos
          </span>
        </div>
        <span
          className="vet-mono text-[12px] font-extrabold"
          style={{ color: "var(--vet-text-3)" }}
        >
          Total · {formatMxn(totalRev)}
        </span>
      </div>

      <div
        className="relative w-full"
        style={{ height: chartHeight }}
      >
        {/* Y grid */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[1, 0.75, 0.5, 0.25, 0].map((p) => (
            <div
              key={p}
              className="flex items-center gap-2"
              style={{ height: 0 }}
            >
              <span
                className="vet-mono text-[10px] font-bold w-12 text-right -translate-y-[6px]"
                style={{ color: "var(--vet-text-3)" }}
              >
                {p === 0 ? "$0" : compactMxn(max * p)}
              </span>
              <div
                className="flex-1 border-t"
                style={{
                  borderTopStyle: p === 0 ? "solid" : "dashed",
                  borderTopColor: "var(--vet-border)",
                  borderTopWidth: 1,
                }}
              />
            </div>
          ))}
        </div>

        {/* Bars */}
        <div
          className="absolute inset-0 pl-14 flex items-end gap-[3px] sm:gap-1"
        >
          {buckets.map((b, i) => {
            const heightPct = (b.revenue / max) * 100;
            const isWinner = i === winnerIdx;
            return (
              <div
                key={i}
                className="flex-1 h-full flex items-end justify-center relative group"
                title={`${b.label}${b.sublabel ? ` (${b.sublabel})` : ""} · ${formatMxn(b.revenue)}`}
              >
                <div
                  className="w-full max-w-[42px] rounded-t-[6px] relative transition-all"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: b.revenue > 0 ? 3 : 0,
                    background: isWinner
                      ? "linear-gradient(180deg, var(--vet-green), var(--vet-green-dim))"
                      : "linear-gradient(180deg, color-mix(in oklab, var(--vet-green) 75%, var(--vet-bg-mid)), color-mix(in oklab, var(--vet-green-dim) 65%, var(--vet-bg-mid)))",
                  }}
                >
                  {size === "modal" && b.revenue > 0 && (
                    <span
                      className="absolute -top-5 left-1/2 -translate-x-1/2 vet-mono text-[10px] font-extrabold whitespace-nowrap"
                      style={{ color: "var(--vet-text-2)" }}
                    >
                      {compactMxn(b.revenue)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X labels */}
      <div className="pl-14 mt-2 flex gap-[3px] sm:gap-1">
        {buckets.map((b, i) => {
          const show =
            i % labelShowEvery === 0 ||
            i === buckets.length - 1 ||
            buckets.length === 1;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center text-center"
              style={{ minWidth: 0 }}
            >
              {show && (
                <>
                  <span
                    className="text-[10px] font-extrabold truncate w-full"
                    style={{ color: "var(--vet-text-2)" }}
                  >
                    {b.label}
                  </span>
                  {b.sublabel && (
                    <span
                      className="text-[9px] font-bold"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      {b.sublabel}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function compactMxn(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
}

/* Top clients horizontal bars */

function TopClientsChart({
  filtered,
  size,
}: {
  filtered: Appointment[];
  size: "card" | "modal";
}) {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const a of filtered) {
    if (a.status !== "COMPLETED") continue;
    const cur = map.get(a.clientName) ?? { count: 0, revenue: 0 };
    cur.count++;
    cur.revenue += a.priceEstimate;
    map.set(a.clientName, cur);
  }
  const limit = size === "modal" ? 20 : 5;
  const top = [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit);
  if (top.length === 0) return <EmptyChart />;
  const max = top[0][1].count;
  const labelWidth = size === "modal" ? "w-48" : "w-28";
  const rowHeight = size === "modal" ? "h-8" : "h-6";
  return (
    <div className="flex flex-col gap-2.5 flex-1 justify-center">
      {top.map(([name, v], i) => (
        <div key={name} className="flex items-center gap-2">
          {size === "modal" && (
            <span
              className="w-5 text-right vet-mono text-[11px] font-extrabold"
              style={{ color: "var(--vet-text-3)" }}
            >
              {i + 1}
            </span>
          )}
          <div
            className={`${labelWidth} truncate text-[12px] font-extrabold text-right`}
            style={{ color: "var(--vet-text-1)" }}
            title={name}
          >
            {name}
          </div>
          <div
            className={`flex-1 ${rowHeight} rounded-[6px] relative overflow-hidden`}
            style={{ background: "var(--vet-bg-hover)" }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-[6px]"
              style={{
                width: `${(v.count / max) * 100}%`,
                background:
                  "linear-gradient(90deg, var(--vet-amber), oklch(58% 0.16 45))",
              }}
            />
          </div>
          <div
            className="w-9 text-right vet-mono text-[13px] font-extrabold"
            style={{ color: "var(--vet-amber)" }}
          >
            {v.count}
          </div>
          {size === "modal" && (
            <div
              className="w-24 text-right vet-mono text-[11px] font-bold"
              style={{ color: "var(--vet-text-3)" }}
            >
              {formatMxn(v.revenue)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* Service distribution donut */

function ServiceDistribution({
  filtered,
  size,
}: {
  filtered: Appointment[];
  size: "card" | "modal";
}) {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const a of filtered) {
    if (a.status !== "COMPLETED") continue;
    const cur = map.get(a.serviceName) ?? { count: 0, revenue: 0 };
    cur.count++;
    cur.revenue += a.priceEstimate;
    map.set(a.serviceName, cur);
  }
  const entries = [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  const total = entries.reduce((acc, [, v]) => acc + v.count, 0);
  if (total === 0) return <EmptyChart />;

  const palette = [
    "var(--vet-green)",
    "var(--vet-blue-dim)",
    "var(--vet-violet)",
    "var(--vet-amber)",
    "var(--vet-red)",
    "oklch(56% 0.12 200)",
    "oklch(60% 0.14 280)",
    "oklch(50% 0.13 130)",
    "oklch(55% 0.16 5)",
  ];

  // Donut
  const r = 38;
  const cx = 50;
  const cy = 50;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const donutSize = size === "modal" ? 260 : 140;
  const legendLimit = size === "modal" ? 20 : 6;

  return (
    <div
      className={`flex ${
        size === "modal" ? "flex-col sm:flex-row" : "flex-row"
      } items-center gap-5 flex-1 min-h-[180px]`}
    >
      <svg
        viewBox="0 0 100 100"
        style={{ width: donutSize, height: donutSize }}
        className="shrink-0"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--vet-bg-hover)"
          strokeWidth={12}
        />
        {entries.map(([name, v], i) => {
          const portion = v.count / total;
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
          y={cy - 1}
          textAnchor="middle"
          className="vet-mono"
          style={{ fontSize: 14, fontWeight: 800, fill: "var(--vet-text-1)" }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          style={{ fontSize: 5, fontWeight: 800, fill: "var(--vet-text-3)" }}
        >
          CITAS
        </text>
      </svg>
      <div className="flex-1 flex flex-col gap-1.5 min-w-0 w-full">
        {entries.slice(0, legendLimit).map(([name, v], i) => (
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
              {v.count}
            </span>
            <span
              className="text-[10px] font-bold w-9 text-right"
              style={{ color: "var(--vet-text-3)" }}
            >
              {Math.round((v.count / total) * 100)}%
            </span>
            {size === "modal" && (
              <span
                className="vet-mono text-[11px] font-bold w-24 text-right"
                style={{ color: "var(--vet-text-3)" }}
              >
                {formatMxn(v.revenue)}
              </span>
            )}
          </div>
        ))}
        {entries.length > legendLimit && (
          <p
            className="text-[10px] font-bold mt-1"
            style={{ color: "var(--vet-text-3)" }}
          >
            +{entries.length - legendLimit} servicios más
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
  size,
}: {
  filtered: Appointment[];
  vets: Vet[];
  size: "card" | "modal";
}) {
  const map = new Map<
    string,
    { name: string; completed: number; revenue: number }
  >();
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
  const limit = size === "modal" ? 20 : 6;
  const labelWidth = size === "modal" ? "w-48" : "w-28";
  const rowHeight = size === "modal" ? "h-8" : "h-6";
  return (
    <div className="flex flex-col gap-2.5 flex-1 justify-center">
      {rows.slice(0, limit).map((r, i) => (
        <div key={r.name} className="flex items-center gap-2">
          {size === "modal" && (
            <span
              className="w-5 text-right vet-mono text-[11px] font-extrabold"
              style={{ color: "var(--vet-text-3)" }}
            >
              {i + 1}
            </span>
          )}
          <div
            className={`${labelWidth} truncate text-[12px] font-extrabold text-right`}
            style={{ color: "var(--vet-text-1)" }}
            title={r.name}
          >
            {r.name}
          </div>
          <div
            className={`flex-1 ${rowHeight} rounded-[6px] relative overflow-hidden`}
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
            className="w-9 text-right vet-mono text-[13px] font-extrabold"
            style={{ color: "var(--vet-green)" }}
          >
            {r.completed}
          </div>
          {size === "modal" && (
            <div
              className="w-24 text-right vet-mono text-[11px] font-bold"
              style={{ color: "var(--vet-text-3)" }}
            >
              {formatMxn(r.revenue)}
            </div>
          )}
        </div>
      ))}
      {rows.length > limit && (
        <p
          className="text-[10px] font-bold mt-1"
          style={{ color: "var(--vet-text-3)" }}
        >
          +{rows.length - limit} veterinarios más
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
