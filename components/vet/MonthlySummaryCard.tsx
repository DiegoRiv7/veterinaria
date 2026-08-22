"use client";

import { useEffect, useMemo, useState } from "react";
import { VetIcon } from "./VetIcon";
import { FancySelect, VET_TOKENS } from "@/components/FancySelect";

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

type MessageStub = { date: string };

type Props = {
  monthRows: MonthRow[];
  appointments: AppointmentDetail[];
  messages: MessageStub[];
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
function formatMxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}

/* ─── Trigger card ────────────────────────────────────── */

export function MonthlySummaryCard({
  monthRows,
  appointments,
  messages,
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
        className="vet-float text-left border p-4 transition-all hover:-translate-y-0.5 hover:[border-color:var(--vet-green)] flex-1 flex flex-col cursor-pointer"
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
          messages={messages}
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
  messages,
  currentMonth,
  vetName,
  onClose,
}: {
  appointments: AppointmentDetail[];
  messages: MessageStub[];
  currentMonth: { year: number; month: number };
  vetName: string;
  onClose: () => void;
}) {
  void vetName;
  const [tab, setTab] = useState<Tab>("dia");
  const [closing, setClosing] = useState(false);

  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();
  const [dayStr, setDayStr] = useState(todayStr);
  const [monthKey, setMonthKey] = useState(`${currentMonth.year}-${currentMonth.month}`);

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

  function rangeFor(t: Tab, ds: string, mk: string): { start: Date; end: Date } {
    if (t === "dia") {
      const day = new Date(ds + "T00:00:00");
      return { start: startOfDay(day), end: endOfDay(day) };
    }
    const [y, m] = mk.split("-").map(Number);
    return {
      start: new Date(y, m, 1),
      end: new Date(y, m + 1, 1),
    };
  }
  function previousRange(t: Tab, ds: string, mk: string): { start: Date; end: Date; label: string } {
    if (t === "dia") {
      const day = new Date(ds + "T00:00:00");
      const prev = new Date(day);
      prev.setDate(prev.getDate() - 1);
      return { start: startOfDay(prev), end: endOfDay(prev), label: "Día anterior" };
    }
    const [y, m] = mk.split("-").map(Number);
    return {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m, 1),
      label: "Mes anterior",
    };
  }

  const range = rangeFor(tab, dayStr, monthKey);
  const prevRange = previousRange(tab, dayStr, monthKey);

  const inRange = useMemo(
    () =>
      appointments.filter((a) => {
        const t = new Date(a.date).getTime();
        return t >= range.start.getTime() && t < range.end.getTime();
      }),
    [appointments, range.start, range.end]
  );
  const inPrevRange = useMemo(
    () =>
      appointments.filter((a) => {
        const t = new Date(a.date).getTime();
        return t >= prevRange.start.getTime() && t < prevRange.end.getTime();
      }),
    [appointments, prevRange.start, prevRange.end]
  );

  const messagesInRange = useMemo(
    () =>
      messages.filter((m) => {
        const t = new Date(m.date).getTime();
        return t >= range.start.getTime() && t < range.end.getTime();
      }).length,
    [messages, range.start, range.end]
  );

  const insights = useMemo(() => {
    const completed = inRange.filter((a) => a.status === "COMPLETED");
    const totalRevenue = completed.reduce((acc, a) => acc + a.priceEstimate, 0);
    const cancelled = inRange.filter(
      (a) => a.status === "CANCELLED" || a.status === "NO_SHOW"
    ).length;
    const attendanceRate = inRange.length
      ? Math.round((completed.length / inRange.length) * 100)
      : 0;

    const clientCounts = new Map<string, number>();
    const petCounts = new Map<string, number>();
    const svcCounts = new Map<string, number>();
    for (const a of inRange) {
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
    for (const a of inRange) byCategory[categoryFor(a.serviceName)]++;

    const prevRevenue = inPrevRange
      .filter((a) => a.status === "COMPLETED")
      .reduce((acc, a) => acc + a.priceEstimate, 0);

    return {
      total: inRange.length,
      revenue: totalRevenue,
      prevRevenue,
      attendanceRate,
      cancelled,
      topClient: top(clientCounts),
      topPet: top(petCounts),
      topService: top(svcCounts),
      byCategory,
    };
  }, [inRange, inPrevRange]);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 220);
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
              <FancySelect
                value={monthKey}
                onChange={setMonthKey}
                required
                options={monthOptions.map((m) => ({
                  value: `${m.year}-${m.month}`,
                  label: `${MONTH_NAMES[m.month]} ${m.year}`,
                }))}
                height={36}
                fontSize={13}
                radius={10}
                accent="var(--vet-green)"
                tokens={VET_TOKENS}
                className="w-[180px]"
              />
            )}
          </div>

          {/* Insights — 6 tiles */}
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
              label="Mensajes contestados"
              primary={String(messagesInRange)}
              secondary={
                messagesInRange === 0
                  ? "Sin actividad"
                  : `Enviados a clientes`
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

          {/* Income comparison + category bars */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
            <IncomeComparisonChart
              currentLabel={tab === "dia" ? "Hoy" : "Este mes"}
              previousLabel={prevRange.label}
              current={insights.revenue}
              previous={insights.prevRevenue}
            />
            {insights.total > 0 ? (
              <CategoryBars byCategory={insights.byCategory} />
            ) : (
              <div
                className="border p-10 rounded-[18px] text-center flex flex-col items-center justify-center"
                style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
              >
                <p className="text-[14px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                  Sin citas en este {tab === "dia" ? "día" : "mes"}
                </p>
                <p className="text-[12px] font-semibold mt-1" style={{ color: "var(--vet-text-3)" }}>
                  Prueba con otra fecha.
                </p>
              </div>
            )}
          </div>
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

/* ─── Income comparison chart ─────────────────────────── */

function IncomeComparisonChart({
  currentLabel,
  previousLabel,
  current,
  previous,
}: {
  currentLabel: string;
  previousLabel: string;
  current: number;
  previous: number;
}) {
  const max = Math.max(1, current, previous);
  const currentPct = (current / max) * 100;
  const prevPct = (previous / max) * 100;

  const delta = current - previous;
  const deltaPct = previous === 0 ? (current > 0 ? 100 : 0) : Math.round((delta / previous) * 100);
  const positive = delta >= 0;

  return (
    <div
      className="border p-5 rounded-[18px] flex flex-col gap-4"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <div>
        <h3 className="font-extrabold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
          Ingresos vs. {previousLabel.toLowerCase()}
        </h3>
        <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--vet-text-3)" }}>
          Comparativa de citas atendidas
        </p>
      </div>

      {/* Current bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[12px] font-extrabold uppercase tracking-wider" style={{ color: "var(--vet-green)" }}>
            {currentLabel}
          </span>
          <span className="vet-mono text-[18px] font-black" style={{ color: "var(--vet-text-1)" }}>
            {formatMxn(current)}
          </span>
        </div>
        <div className="h-3 rounded-full" style={{ background: "var(--vet-bg-hover)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${currentPct}%`,
              background: "linear-gradient(90deg, var(--vet-green), oklch(58% 0.18 155))",
              boxShadow: "0 2px 10px var(--vet-green-glow)",
            }}
          />
        </div>
      </div>

      {/* Previous bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[12px] font-extrabold uppercase tracking-wider" style={{ color: "var(--vet-text-3)" }}>
            {previousLabel}
          </span>
          <span className="vet-mono text-[16px] font-extrabold" style={{ color: "var(--vet-text-2)" }}>
            {formatMxn(previous)}
          </span>
        </div>
        <div className="h-3 rounded-full" style={{ background: "var(--vet-bg-hover)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${prevPct}%`,
              background: "color-mix(in oklab, var(--vet-green) 30%, var(--vet-bg-hover))",
            }}
          />
        </div>
      </div>

      {/* Delta */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] border"
        style={{
          background: positive
            ? "color-mix(in oklab, var(--vet-green) 12%, transparent)"
            : "color-mix(in oklab, var(--vet-red) 12%, transparent)",
          borderColor: positive
            ? "color-mix(in oklab, var(--vet-green) 30%, transparent)"
            : "color-mix(in oklab, var(--vet-red) 30%, transparent)",
        }}
      >
        <span style={{ color: positive ? "var(--vet-green)" : "var(--vet-red)" }}>
          {positive ? <ArrowUpIcon /> : <ArrowDownIcon />}
        </span>
        <span
          className="vet-mono text-[14px] font-extrabold"
          style={{ color: positive ? "var(--vet-green)" : "var(--vet-red)" }}
        >
          {positive ? "+" : ""}
          {deltaPct}%
        </span>
        <span className="text-[12px] font-semibold" style={{ color: "var(--vet-text-2)" }}>
          {positive ? "más" : "menos"} ingreso · {positive ? "+" : ""}
          {formatMxn(delta)}
        </span>
      </div>
    </div>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

/* ─── Category bars ───────────────────────────────────── */

function CategoryBars({ byCategory }: { byCategory: Record<Category, number> }) {
  const max = Math.max(1, ...Object.values(byCategory));
  return (
    <div
      className="border p-5 rounded-[18px] flex flex-col gap-3"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
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
