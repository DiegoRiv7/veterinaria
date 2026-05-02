"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VetIcon } from "@/components/vet/VetIcon";

/* ─── Types ───────────────────────────────────────────── */

type Appointment = {
  id: string;
  date: string;
  status: string;
  priceEstimate: number;
  petName: string;
  petSpecies: string;
  serviceName: string;
  vetId: string;
  vetName: string;
};

type Vet = { id: string; name: string };

type Tab = "dia" | "mes" | "año" | "comparar";

type StatusKey = "COMPLETED" | "SCHEDULED" | "CANCELLED" | "NO_SHOW";
type Category = "consultas" | "cirugias" | "vacunaciones" | "otros";

type Aggregate = {
  total: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  revenue: number;
  avgPerCompleted: number;
  byCategory: Record<Category, number>;
  topPet: { name: string; count: number } | null;
  topService: { name: string; count: number } | null;
};

/* ─── Constants ───────────────────────────────────────── */

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTH_NAMES_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const CATEGORY_META: { key: Category; label: string; color: string }[] = [
  { key: "consultas", label: "Consultas", color: "var(--vet-green)" },
  { key: "cirugias", label: "Cirugías", color: "var(--vet-blue)" },
  { key: "vacunaciones", label: "Vacunaciones", color: "var(--vet-violet)" },
  { key: "otros", label: "Otros", color: "var(--vet-amber)" },
];

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
const ALL_STATUSES: StatusKey[] = ["COMPLETED", "SCHEDULED", "CANCELLED", "NO_SHOW"];

/* ─── Helpers ─────────────────────────────────────────── */

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
function formatDateShort(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(d);
}
function formatTime(d: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function aggregate(appts: Appointment[]): Aggregate {
  const completed = appts.filter((a) => a.status === "COMPLETED");
  const scheduled = appts.filter((a) => a.status === "SCHEDULED");
  const cancelled = appts.filter((a) => a.status === "CANCELLED" || a.status === "NO_SHOW");
  const revenue = completed.reduce((acc, a) => acc + a.priceEstimate, 0);

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
    avgPerCompleted: completed.length ? Math.round(revenue / completed.length) : 0,
    byCategory,
    topPet: topPetEntry ? { name: topPetEntry[0], count: topPetEntry[1] } : null,
    topService: topSvcEntry ? { name: topSvcEntry[0], count: topSvcEntry[1] } : null,
  };
}

/* ─── Main component ──────────────────────────────────── */

type Props = {
  appointments: Appointment[];
  vets: Vet[];
  currentMonth: { year: number; month: number };
};

export function AdminReportsClient({ appointments, vets, currentMonth }: Props) {
  const [tab, setTab] = useState<Tab>("mes");

  // Day/month selectors
  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();
  const [dayStr, setDayStr] = useState(todayStr);
  const [monthKey, setMonthKey] = useState(`${currentMonth.year}-${currentMonth.month}`);
  const [combined, setCombined] = useState<Set<string>>(
    new Set([`${currentMonth.year}-${currentMonth.month}`])
  );

  // Filters
  const [vetFilter, setVetFilter] = useState<Set<string>>(new Set(vets.map((v) => v.id)));
  const [statusFilter, setStatusFilter] = useState<Set<StatusKey>>(new Set(ALL_STATUSES));
  const [categoryFilter, setCategoryFilter] = useState<Set<Category>>(
    new Set(CATEGORY_META.map((c) => c.key))
  );

  // Per-vet table sort
  type SortKey = "name" | "total" | "completed" | "cancelled" | "revenue" | "rate" | "avg";
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  // Apply tab range
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
    return appointments;
  }, [tab, dayStr, monthKey, combined, appointments]);

  // Apply filters
  const filtered = useMemo(() => {
    return tabAppointments.filter(
      (a) =>
        vetFilter.has(a.vetId) &&
        statusFilter.has(a.status as StatusKey) &&
        categoryFilter.has(categoryFor(a.serviceName))
    );
  }, [tabAppointments, vetFilter, statusFilter, categoryFilter]);

  const stats = useMemo(() => aggregate(filtered), [filtered]);

  // Per-vet stats — uses tabAppointments so vet filter doesn't hide vets from the table
  // (instead it grays them out)
  const perVet = useMemo(() => {
    const tabFilteredByStatusAndCat = tabAppointments.filter(
      (a) =>
        statusFilter.has(a.status as StatusKey) &&
        categoryFilter.has(categoryFor(a.serviceName))
    );
    const byVet = new Map<string, Appointment[]>();
    for (const v of vets) byVet.set(v.id, []);
    for (const a of tabFilteredByStatusAndCat) {
      const existing = byVet.get(a.vetId) ?? [];
      existing.push(a);
      byVet.set(a.vetId, existing);
    }
    const rows = vets.map((v) => {
      const vAppts = byVet.get(v.id) ?? [];
      const completed = vAppts.filter((a) => a.status === "COMPLETED");
      const cancelled = vAppts.filter(
        (a) => a.status === "CANCELLED" || a.status === "NO_SHOW"
      );
      const revenue = completed.reduce((acc, a) => acc + a.priceEstimate, 0);
      return {
        vetId: v.id,
        vetName: v.name,
        total: vAppts.length,
        completed: completed.length,
        scheduled: vAppts.filter((a) => a.status === "SCHEDULED").length,
        cancelled: cancelled.length,
        revenue,
        rate: vAppts.length ? Math.round((completed.length / vAppts.length) * 100) : 0,
        avg: completed.length ? Math.round(revenue / completed.length) : 0,
        active: vetFilter.has(v.id),
      };
    });
    return rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.vetName.localeCompare(b.vetName);
      } else {
        cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [tabAppointments, statusFilter, categoryFilter, vets, vetFilter, sortKey, sortDir]);

  function setSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleVet(id: string) {
    const next = new Set(vetFilter);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setVetFilter(next);
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

  function resetFilters() {
    setVetFilter(new Set(vets.map((v) => v.id)));
    setStatusFilter(new Set(ALL_STATUSES));
    setCategoryFilter(new Set(CATEGORY_META.map((c) => c.key)));
  }

  const filtersActive =
    vetFilter.size !== vets.length ||
    statusFilter.size !== ALL_STATUSES.length ||
    categoryFilter.size !== CATEGORY_META.length;

  function exportCsv() {
    const headerRow = ["Fecha", "Hora", "Veterinario", "Paciente", "Servicio", "Estado", "Precio"];
    const rows = filtered.map((a) => {
      const d = new Date(a.date);
      return [
        new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d),
        formatTime(d),
        a.vetName,
        a.petName,
        a.serviceName,
        STATUS_LABEL[a.status as StatusKey] ?? a.status,
        a.priceEstimate.toString(),
      ];
    });
    const summary = [
      [],
      ["Resumen general"],
      ["Total citas", String(stats.total)],
      ["Atendidas", String(stats.completed)],
      ["Pendientes", String(stats.scheduled)],
      ["Canceladas", String(stats.cancelled)],
      ["Ingresos (MXN)", String(stats.revenue)],
      ["Promedio por atendida (MXN)", String(stats.avgPerCompleted)],
      ["Paciente top", stats.topPet ? `${stats.topPet.name} (${stats.topPet.count})` : "—"],
      ["Servicio top", stats.topService ? `${stats.topService.name} (${stats.topService.count})` : "—"],
      [],
      ["Rendimiento por veterinario"],
      ["Veterinario", "Citas", "Atendidas", "Pendientes", "Canceladas", "Ingresos", "Asistencia %", "Avg/atendida"],
      ...perVet.map((p) => [
        p.vetName,
        String(p.total),
        String(p.completed),
        String(p.scheduled),
        String(p.cancelled),
        String(p.revenue),
        `${p.rate}%`,
        String(p.avg),
      ]),
    ];
    const all = [headerRow, ...rows, ...summary];
    const csv = all
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="vet-theme min-h-dvh">
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-7 py-4 border-b backdrop-blur"
        style={{
          background: "color-mix(in oklab, var(--vet-bg-mid) 92%, transparent)",
          borderBottomColor: "var(--vet-border)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center w-10 h-10 rounded-[12px] border"
            aria-label="Volver al admin"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
          >
            <VetIcon name="chevronLeft" size={18} color="var(--vet-text-2)" />
          </Link>
          <div>
            <h1
              className="text-[20px] sm:text-[22px] font-black tracking-tight"
              style={{ color: "var(--vet-text-1)" }}
            >
              Reportes
            </h1>
            <p className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
              {appointments.length} citas en los últimos 12 meses · {vets.length} veterinarios
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-[12px] text-[13px] font-extrabold text-white transition-all hover:brightness-105 active:scale-[.99]"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
            boxShadow: "0 8px 24px var(--vet-green-glow)",
          }}
        >
          <ExportIcon /> Exportar Excel
        </button>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 sm:p-7 flex flex-col gap-5">
        {/* Filter card */}
        <section
          className="border p-5 sm:p-6 flex flex-col gap-5"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            borderRadius: 22,
          }}
        >
          {/* Tabs + range selector */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className={labelClass} style={labelStyle}>
                Período
              </label>
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
                    {t === "dia" ? "Día" : t === "mes" ? "Mes" : t === "año" ? "Año" : "Comparar"}
                  </button>
                ))}
              </div>
            </div>

            {tab === "dia" && (
              <div>
                <label className={labelClass} style={labelStyle}>Día</label>
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
              </div>
            )}
            {tab === "mes" && (
              <div>
                <label className={labelClass} style={labelStyle}>Mes</label>
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
              </div>
            )}
            {tab === "comparar" && (
              <div className="flex-1 min-w-[280px]">
                <label className={labelClass} style={labelStyle}>Meses a combinar</label>
                <div className="flex flex-wrap gap-1.5">
                  {monthOptions.map((m) => {
                    const k = `${m.year}-${m.month}`;
                    const active = combined.has(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleMonth(k)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors"
                        style={{
                          background: active ? "var(--vet-green-glow)" : "transparent",
                          borderColor: active ? "var(--vet-green)" : "var(--vet-border)",
                          color: active ? "var(--vet-green)" : "var(--vet-text-3)",
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

          {/* Vet filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass} style={labelStyle}>
                Veterinario ({vetFilter.size}/{vets.length})
              </label>
              <button
                type="button"
                onClick={() =>
                  setVetFilter(
                    vetFilter.size === vets.length ? new Set() : new Set(vets.map((v) => v.id))
                  )
                }
                className="text-[11px] font-extrabold"
                style={{ color: "var(--vet-green)" }}
              >
                {vetFilter.size === vets.length ? "Quitar todos" : "Seleccionar todos"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {vets.map((v) => {
                const active = vetFilter.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleVet(v.id)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors"
                    style={{
                      background: active ? "var(--vet-green-glow)" : "transparent",
                      borderColor: active ? "var(--vet-green)" : "var(--vet-border)",
                      color: active ? "var(--vet-green)" : "var(--vet-text-3)",
                      opacity: active ? 1 : 0.55,
                    }}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Category filters */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div>
              <label className={labelClass} style={labelStyle}>Estado</label>
              <div className="flex flex-wrap gap-2">
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
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                      {STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Servicio</label>
              <div className="flex flex-wrap gap-2">
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
                        opacity: active ? 1 : 0.55,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="self-start text-[12px] font-extrabold"
              style={{ color: "var(--vet-text-3)" }}
            >
              Limpiar filtros
            </button>
          )}
        </section>

        {/* KPI grid */}
        <section className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiTile label="Total" value={stats.total} color="var(--vet-text-1)" />
          <KpiTile label="Atendidas" value={stats.completed} color="var(--vet-blue)" />
          <KpiTile label="Pendientes" value={stats.scheduled} color="var(--vet-green)" />
          <KpiTile label="Canceladas" value={stats.cancelled} color="var(--vet-red)" />
          <KpiTile label="Ingresos" value={formatMxn(stats.revenue)} color="var(--vet-violet)" />
          <KpiTile
            label="Promedio"
            value={formatMxn(stats.avgPerCompleted)}
            color="var(--vet-amber)"
            sub="por atendida"
          />
        </section>

        {/* Highlights */}
        <section className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <Highlight
            label="Paciente más atendido"
            primary={stats.topPet?.name ?? "—"}
            secondary={stats.topPet ? `${stats.topPet.count} ${stats.topPet.count === 1 ? "cita" : "citas"}` : "Sin datos"}
            color="var(--vet-amber)"
          />
          <Highlight
            label="Servicio más solicitado"
            primary={stats.topService?.name ?? "—"}
            secondary={stats.topService ? `${stats.topService.count} ${stats.topService.count === 1 ? "vez" : "veces"}` : "Sin datos"}
            color="var(--vet-violet)"
          />
        </section>

        {/* Per-vet performance */}
        <section
          className="border overflow-hidden"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            borderRadius: 22,
          }}
        >
          <div
            className="px-5 py-4 border-b"
            style={{ borderBottomColor: "var(--vet-border)" }}
          >
            <h2
              className="font-extrabold text-[15px]"
              style={{ color: "var(--vet-text-1)" }}
            >
              Rendimiento por veterinario
            </h2>
            <p className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
              Click en cualquier columna para ordenar
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--vet-bg-mid)" }}>
                  <Th sortKey="name" current={sortKey} dir={sortDir} onClick={setSort} align="left">
                    Veterinario
                  </Th>
                  <Th sortKey="total" current={sortKey} dir={sortDir} onClick={setSort}>Citas</Th>
                  <Th sortKey="completed" current={sortKey} dir={sortDir} onClick={setSort}>Atendidas</Th>
                  <Th sortKey="cancelled" current={sortKey} dir={sortDir} onClick={setSort}>Canceladas</Th>
                  <Th sortKey="rate" current={sortKey} dir={sortDir} onClick={setSort}>Asistencia</Th>
                  <Th sortKey="revenue" current={sortKey} dir={sortDir} onClick={setSort}>Ingresos</Th>
                  <Th sortKey="avg" current={sortKey} dir={sortDir} onClick={setSort}>Avg/cita</Th>
                </tr>
              </thead>
              <tbody>
                {perVet.map((p) => (
                  <tr
                    key={p.vetId}
                    style={{
                      borderTop: "1px solid var(--vet-border)",
                      opacity: p.active ? 1 : 0.4,
                    }}
                    className="hover:[background:var(--vet-bg-hover)]"
                  >
                    <td className="px-5 py-3 font-extrabold" style={{ color: "var(--vet-text-1)" }}>
                      {p.vetName}
                      {!p.active && (
                        <span className="ml-2 text-[10px] font-bold" style={{ color: "var(--vet-text-3)" }}>
                          (oculto)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 vet-mono text-right font-bold" style={{ color: "var(--vet-text-1)" }}>
                      {p.total}
                    </td>
                    <td className="px-3 py-3 vet-mono text-right font-bold" style={{ color: "var(--vet-blue)" }}>
                      {p.completed}
                    </td>
                    <td className="px-3 py-3 vet-mono text-right font-bold" style={{ color: "var(--vet-red)" }}>
                      {p.cancelled}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <RateBar pct={p.rate} />
                    </td>
                    <td className="px-3 py-3 vet-mono text-right font-bold" style={{ color: "var(--vet-violet)" }}>
                      {formatMxn(p.revenue)}
                    </td>
                    <td className="px-3 py-3 vet-mono text-right font-bold" style={{ color: "var(--vet-text-2)" }}>
                      {formatMxn(p.avg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Charts row */}
        <section className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
          <DonutChart byCategory={stats.byCategory} total={stats.total} />
          <CategoryBars byCategory={stats.byCategory} />
        </section>

        {/* Per-vet comparison bars */}
        <PerVetComparisonChart rows={perVet.filter((p) => p.active)} />

        {/* Tab-specific time chart */}
        {tab === "dia" && <HourlyChart appts={filtered} />}
        {tab === "mes" && <DailyChart appts={filtered} monthKey={monthKey} />}
        {tab === "año" && <YearlyChart appointments={appointments} statusFilter={statusFilter} categoryFilter={categoryFilter} vetFilter={vetFilter} />}

        {/* Details */}
        <DetailsList appts={filtered} />
      </main>
    </div>
  );
}

/* ─── Reusable bits ───────────────────────────────────── */

const labelClass = "block text-[11px] font-extrabold uppercase tracking-wider mb-1.5";
const labelStyle = { color: "var(--vet-text-3)" } as const;

function KpiTile({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div
      className="border p-4 rounded-[16px]"
      style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
    >
      <div className="vet-mono text-[24px] font-bold leading-tight" style={{ color }}>
        {value}
      </div>
      <div className="text-[12px] font-bold mt-1" style={{ color: "var(--vet-text-2)" }}>
        {label}
      </div>
      {sub && (
        <div className="text-[10px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Highlight({
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
      className="border p-4 rounded-[16px] flex items-center gap-3"
      style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
    >
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center"
        style={{ background: `color-mix(in oklab, ${color} 15%, transparent)` }}
      >
        <VetIcon name="paw" size={20} color={color} />
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

function Th({
  children,
  sortKey,
  current,
  dir,
  onClick,
  align = "right",
}: {
  children: React.ReactNode;
  sortKey: string;
  current: string;
  dir: "asc" | "desc";
  onClick: (k: never) => void;
  align?: "left" | "right";
}) {
  const isActive = current === sortKey;
  return (
    <th
      onClick={() => onClick(sortKey as never)}
      className={`px-3 py-3 text-[11px] font-extrabold uppercase tracking-wider cursor-pointer select-none ${
        align === "left" ? "text-left" : "text-right"
      }`}
      style={{ color: isActive ? "var(--vet-green)" : "var(--vet-text-3)" }}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive && <span className="text-[9px]">{dir === "asc" ? "▲" : "▼"}</span>}
      </span>
    </th>
  );
}

function RateBar({ pct }: { pct: number }) {
  const color =
    pct >= 85 ? "var(--vet-green)" : pct >= 70 ? "var(--vet-amber)" : "var(--vet-red)";
  return (
    <div className="inline-flex items-center gap-2">
      <span className="vet-mono text-[12px] font-bold" style={{ color }}>
        {pct}%
      </span>
      <div className="w-16 h-1.5 rounded-full" style={{ background: "var(--vet-bg-hover)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
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
      style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
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
      style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
    >
      <h3 className="font-extrabold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
        Distribución por categoría
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

function PerVetComparisonChart({
  rows,
}: {
  rows: { vetId: string; vetName: string; total: number; completed: number; scheduled: number; cancelled: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <section
      className="border p-5 sm:p-6 rounded-[22px]"
      style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
          Comparativa entre veterinarios
        </h2>
        <Legend />
      </div>
      {rows.length === 0 ? (
        <div className="py-10 text-center text-[14px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
          Selecciona al menos un veterinario para ver la comparativa.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <div key={r.vetId} className="flex items-center gap-4">
              <div
                className="w-32 sm:w-40 truncate text-[13px] font-extrabold flex-shrink-0"
                style={{ color: "var(--vet-text-1)" }}
                title={r.vetName}
              >
                {r.vetName}
              </div>
              <div className="flex-1 h-7 rounded-[10px] flex overflow-hidden relative" style={{ background: "var(--vet-bg-hover)" }}>
                {r.completed > 0 && (
                  <div
                    style={{
                      width: `${(r.completed / max) * 100}%`,
                      background: "var(--vet-blue)",
                    }}
                    title={`Atendidas: ${r.completed}`}
                  />
                )}
                {r.scheduled > 0 && (
                  <div
                    style={{
                      width: `${(r.scheduled / max) * 100}%`,
                      background: "var(--vet-green)",
                    }}
                    title={`Pendientes: ${r.scheduled}`}
                  />
                )}
                {r.cancelled > 0 && (
                  <div
                    style={{
                      width: `${(r.cancelled / max) * 100}%`,
                      background: "var(--vet-red)",
                    }}
                    title={`Canceladas: ${r.cancelled}`}
                  />
                )}
              </div>
              <div
                className="vet-mono text-[14px] font-extrabold w-12 text-right flex-shrink-0"
                style={{ color: "var(--vet-text-1)" }}
              >
                {r.total}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function HourlyChart({ appts }: { appts: Appointment[] }) {
  const buckets = Array.from({ length: 12 }, (_, i) => ({ hour: 8 + i, count: 0 }));
  for (const a of appts) {
    const h = new Date(a.date).getHours();
    const idx = h - 8;
    if (idx >= 0 && idx < buckets.length) buckets[idx].count++;
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <section
      className="border p-5 sm:p-6 rounded-[22px]"
      style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
    >
      <h2 className="font-extrabold text-[15px] mb-4" style={{ color: "var(--vet-text-1)" }}>
        Distribución por hora
      </h2>
      <div className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end" style={{ height: 180 }}>
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
    </section>
  );
}

function DailyChart({ appts, monthKey }: { appts: Appointment[]; monthKey: string }) {
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
    <section
      className="border p-5 sm:p-6 rounded-[22px]"
      style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
    >
      <h2 className="font-extrabold text-[15px] mb-4" style={{ color: "var(--vet-text-1)" }}>
        Citas por día
      </h2>
      <div
        className="grid gap-[3px] items-end"
        style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))`, height: 180 }}
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
    </section>
  );
}

function YearlyChart({
  appointments,
  statusFilter,
  categoryFilter,
  vetFilter,
}: {
  appointments: Appointment[];
  statusFilter: Set<StatusKey>;
  categoryFilter: Set<Category>;
  vetFilter: Set<string>;
}) {
  const now = new Date();
  const monthKeys: { year: number; month: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  const buckets = monthKeys.map((mk) => {
    const filtered = appointments.filter((a) => {
      const d = new Date(a.date);
      return (
        d.getFullYear() === mk.year &&
        d.getMonth() === mk.month &&
        statusFilter.has(a.status as StatusKey) &&
        categoryFilter.has(categoryFor(a.serviceName)) &&
        vetFilter.has(a.vetId)
      );
    });
    const byCat: Record<Category, number> = { consultas: 0, cirugias: 0, vacunaciones: 0, otros: 0 };
    for (const a of filtered) byCat[categoryFor(a.serviceName)]++;
    return { ...mk, total: filtered.length, byCat };
  });
  const max = Math.max(1, ...buckets.map((b) => b.total));
  return (
    <section
      className="border p-5 sm:p-6 rounded-[22px]"
      style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
          Citas por mes (últimos 12 meses)
        </h2>
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
    </section>
  );
}

function DetailsList({ appts }: { appts: Appointment[] }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const totalPages = Math.ceil(appts.length / PAGE_SIZE) || 1;
  const visible = appts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section
      className="border overflow-hidden rounded-[22px]"
      style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="text-left">
          <div className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
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
              <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--vet-border)" }}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: "var(--vet-bg-mid)" }}>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--vet-text-3)" }}>Fecha</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--vet-text-3)" }}>Vet</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--vet-text-3)" }}>Paciente</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--vet-text-3)" }}>Servicio</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--vet-text-3)" }}>Estado</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--vet-text-3)" }}>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => {
                      const d = new Date(a.date);
                      const status = a.status as StatusKey;
                      return (
                        <tr key={a.id} style={{ borderTop: "1px solid var(--vet-border)" }}>
                          <td className="px-4 py-3 vet-mono font-bold" style={{ color: "var(--vet-text-2)" }}>
                            {formatDateShort(d)} {formatTime(d)}
                          </td>
                          <td className="px-4 py-3 font-bold" style={{ color: "var(--vet-text-1)" }}>{a.vetName}</td>
                          <td className="px-4 py-3 font-bold" style={{ color: "var(--vet-text-1)" }}>{a.petName}</td>
                          <td className="px-4 py-3 font-semibold" style={{ color: "var(--vet-text-2)" }}>{a.serviceName}</td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase"
                              style={{
                                background: `color-mix(in oklab, ${STATUS_COLOR[status]} 15%, transparent)`,
                                color: STATUS_COLOR[status],
                              }}
                            >
                              {STATUS_LABEL[status] ?? status}
                            </span>
                          </td>
                          <td className="px-4 py-3 vet-mono font-extrabold text-right" style={{ color: "var(--vet-text-1)" }}>
                            {formatMxn(a.priceEstimate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
    </section>
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
