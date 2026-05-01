"use client";

import { useEffect, useMemo, useState } from "react";
import { VetIcon } from "./VetIcon";

type MonthRow = { label: string; val: number; pct: number };

type MonthlyBucket = {
  year: number;
  month: number;
  consultas: number;
  cirugias: number;
  vacunaciones: number;
  otros: number;
  total: number;
};

type Props = {
  monthRows: MonthRow[];
  monthlyBuckets: MonthlyBucket[];
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

const CATEGORY_META = [
  { key: "consultas", label: "Consultas", color: "var(--vet-green)" },
  { key: "cirugias", label: "Cirugías", color: "var(--vet-blue)" },
  { key: "vacunaciones", label: "Vacunaciones", color: "var(--vet-violet)" },
  { key: "otros", label: "Otros", color: "var(--vet-amber)" },
] as const;

type Tab = "mes" | "comparar" | "año";

export function MonthlySummaryCard({
  monthRows,
  monthlyBuckets,
  currentMonth,
  vetName,
}: Props) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while open + close on Escape
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
      {/* Trigger card — same look as before but fully clickable */}
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
            Resumen del Mes
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
          monthlyBuckets={monthlyBuckets}
          currentMonth={currentMonth}
          vetName={vetName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────── */

function SummaryModal({
  monthlyBuckets,
  currentMonth,
  vetName,
  onClose,
}: {
  monthlyBuckets: MonthlyBucket[];
  currentMonth: { year: number; month: number };
  vetName: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("mes");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    `${currentMonth.year}-${currentMonth.month}`
  );
  const [combinedKeys, setCombinedKeys] = useState<Set<string>>(
    new Set([`${currentMonth.year}-${currentMonth.month}`])
  );
  const [closing, setClosing] = useState(false);

  function key(b: { year: number; month: number }) {
    return `${b.year}-${b.month}`;
  }

  const selectedMonth = useMemo(
    () => monthlyBuckets.find((b) => key(b) === selectedMonthKey) ?? monthlyBuckets[monthlyBuckets.length - 1],
    [monthlyBuckets, selectedMonthKey]
  );

  const combinedTotal = useMemo(() => {
    const buckets = monthlyBuckets.filter((b) => combinedKeys.has(key(b)));
    return buckets.reduce(
      (acc, b) => ({
        consultas: acc.consultas + b.consultas,
        cirugias: acc.cirugias + b.cirugias,
        vacunaciones: acc.vacunaciones + b.vacunaciones,
        otros: acc.otros + b.otros,
        total: acc.total + b.total,
      }),
      { consultas: 0, cirugias: 0, vacunaciones: 0, otros: 0, total: 0 }
    );
  }, [monthlyBuckets, combinedKeys]);

  const yearTotal = useMemo(() => {
    return monthlyBuckets.reduce(
      (acc, b) => ({
        consultas: acc.consultas + b.consultas,
        cirugias: acc.cirugias + b.cirugias,
        vacunaciones: acc.vacunaciones + b.vacunaciones,
        otros: acc.otros + b.otros,
        total: acc.total + b.total,
      }),
      { consultas: 0, cirugias: 0, vacunaciones: 0, otros: 0, total: 0 }
    );
  }, [monthlyBuckets]);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 220);
  }

  function exportCsv() {
    const rows = [
      ["Mes", "Consultas", "Cirugías", "Vacunaciones", "Otros", "Total"],
      ...monthlyBuckets.map((b) => [
        `${MONTH_NAMES[b.month]} ${b.year}`,
        b.consultas,
        b.cirugias,
        b.vacunaciones,
        b.otros,
        b.total,
      ]),
      [
        "TOTAL",
        yearTotal.consultas,
        yearTotal.cirugias,
        yearTotal.vacunaciones,
        yearTotal.otros,
        yearTotal.total,
      ],
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    // BOM helps Excel detect UTF-8 with accents like "Cirugías"
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `resumen-${vetName.replace(/\s+/g, "_")}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              Resumen mensual
            </h2>
            <p className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
              Tus citas atendidas, agrupadas por categoría
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

        {/* Tabs */}
        <div className="px-5 sm:px-7 pt-5">
          <div
            className="inline-flex p-1 rounded-[14px] border"
            style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
          >
            {(["mes", "comparar", "año"] as Tab[]).map((t) => (
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
                {t === "mes" ? "Mes" : t === "comparar" ? "Comparar" : "Año entero"}
              </button>
            ))}
          </div>
          {/* Export button (mobile) */}
          <button
            type="button"
            onClick={exportCsv}
            className="sm:hidden ml-2 inline-flex items-center gap-2 px-3 h-9 rounded-[10px] text-[12px] font-extrabold border"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-1)",
            }}
          >
            <ExportIcon /> Exportar
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-7">
          {tab === "mes" && (
            <MonthView
              monthlyBuckets={monthlyBuckets}
              selectedKey={selectedMonthKey}
              onSelectKey={setSelectedMonthKey}
              selected={selectedMonth}
            />
          )}
          {tab === "comparar" && (
            <CompareView
              monthlyBuckets={monthlyBuckets}
              combined={combinedKeys}
              setCombined={setCombinedKeys}
              total={combinedTotal}
            />
          )}
          {tab === "año" && (
            <YearView monthlyBuckets={monthlyBuckets} total={yearTotal} />
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

/* ─── Tab content ───────────────────────────────────────── */

function MonthView({
  monthlyBuckets,
  selectedKey,
  onSelectKey,
  selected,
}: {
  monthlyBuckets: MonthlyBucket[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  selected: MonthlyBucket;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label
          className="block text-[12px] font-extrabold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          Mes
        </label>
        <select
          value={selectedKey}
          onChange={(e) => onSelectKey(e.target.value)}
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
          {[...monthlyBuckets].reverse().map((b) => (
            <option key={`${b.year}-${b.month}`} value={`${b.year}-${b.month}`}>
              {MONTH_NAMES[b.month]} {b.year}
            </option>
          ))}
        </select>
      </div>

      <SummaryStats total={selected} />

      <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
        <DonutCategoryChart total={selected} />
        <CategoryBars total={selected} />
      </div>
    </div>
  );
}

function CompareView({
  monthlyBuckets,
  combined,
  setCombined,
  total,
}: {
  monthlyBuckets: MonthlyBucket[];
  combined: Set<string>;
  setCombined: (s: Set<string>) => void;
  total: { consultas: number; cirugias: number; vacunaciones: number; otros: number; total: number };
}) {
  function toggle(k: string) {
    const next = new Set(combined);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setCombined(next);
  }
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label
          className="block text-[12px] font-extrabold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          Selecciona los meses a combinar
        </label>
        <div className="flex flex-wrap gap-2">
          {monthlyBuckets.map((b) => {
            const k = `${b.year}-${b.month}`;
            const active = combined.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggle(k)}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors"
                style={{
                  background: active ? "var(--vet-green-glow)" : "transparent",
                  borderColor: active ? "var(--vet-green)" : "var(--vet-border)",
                  color: active ? "var(--vet-green)" : "var(--vet-text-2)",
                }}
              >
                {MONTH_NAMES_SHORT[b.month]} {String(b.year).slice(2)}
              </button>
            );
          })}
        </div>
      </div>

      <SummaryStats total={total} />

      {combined.size === 0 ? (
        <div
          className="py-10 text-center text-[14px] font-semibold border rounded-[16px]"
          style={{ borderColor: "var(--vet-border)", color: "var(--vet-text-3)" }}
        >
          Selecciona al menos un mes arriba.
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
          <DonutCategoryChart total={total} />
          <CategoryBars total={total} />
        </div>
      )}
    </div>
  );
}

function YearView({
  monthlyBuckets,
  total,
}: {
  monthlyBuckets: MonthlyBucket[];
  total: { consultas: number; cirugias: number; vacunaciones: number; otros: number; total: number };
}) {
  const max = Math.max(1, ...monthlyBuckets.map((b) => b.total));
  return (
    <div className="flex flex-col gap-5">
      <SummaryStats total={total} />

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
          {monthlyBuckets.map((b) => {
            const heightPct = (b.total / max) * 100;
            return (
              <div
                key={`${b.year}-${b.month}`}
                className="flex flex-col items-center gap-1.5 h-full"
                title={`${MONTH_NAMES[b.month]} ${b.year}: ${b.total} citas`}
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
                      const v = b[cat.key as keyof MonthlyBucket] as number;
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
                <div
                  className="text-[10px] font-extrabold"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {MONTH_NAMES_SHORT[b.month]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CategoryBars total={total} />
    </div>
  );
}

/* ─── Reusable bits ─────────────────────────────────────── */

function SummaryStats({
  total,
}: {
  total: { consultas: number; cirugias: number; vacunaciones: number; otros: number; total: number };
}) {
  const tiles = [
    { label: "Total citas", value: total.total, color: "var(--vet-text-1)", bg: "var(--vet-bg-mid)" },
    { label: "Consultas", value: total.consultas, color: "var(--vet-green)" },
    { label: "Cirugías", value: total.cirugias, color: "var(--vet-blue)" },
    { label: "Vacunaciones", value: total.vacunaciones, color: "var(--vet-violet)" },
  ];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="border p-4 rounded-[16px]"
          style={{
            background: t.bg ?? "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
          }}
        >
          <div className="vet-mono text-[26px] font-bold leading-none" style={{ color: t.color }}>
            {t.value}
          </div>
          <div className="text-[12px] font-bold mt-2" style={{ color: "var(--vet-text-2)" }}>
            {t.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryBars({
  total,
}: {
  total: { consultas: number; cirugias: number; vacunaciones: number; otros: number; total: number };
}) {
  const max = Math.max(1, total.consultas, total.cirugias, total.vacunaciones, total.otros);
  const cats = [
    { label: "Consultas", val: total.consultas, color: "var(--vet-green)" },
    { label: "Cirugías", val: total.cirugias, color: "var(--vet-blue)" },
    { label: "Vacunaciones", val: total.vacunaciones, color: "var(--vet-violet)" },
    { label: "Otros", val: total.otros, color: "var(--vet-amber)" },
  ];
  return (
    <div
      className="border p-5 rounded-[18px] flex flex-col gap-3"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <h3 className="font-extrabold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
        Por categoría
      </h3>
      {cats.map((c) => (
        <div key={c.label}>
          <div className="flex justify-between mb-1">
            <span className="text-[12px] font-bold" style={{ color: "var(--vet-text-2)" }}>
              {c.label}
            </span>
            <span
              className="vet-mono text-[12px] font-extrabold"
              style={{ color: "var(--vet-text-1)" }}
            >
              {c.val}
            </span>
          </div>
          <div className="h-[8px] rounded-full" style={{ background: "var(--vet-bg-hover)" }}>
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${(c.val / max) * 100}%`, background: c.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutCategoryChart({
  total,
}: {
  total: { consultas: number; cirugias: number; vacunaciones: number; otros: number; total: number };
}) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const cats = CATEGORY_META.map((cat) => {
    const v = total[cat.key as keyof typeof total] as number;
    return { ...cat, val: v };
  });
  const sum = total.total || 1;
  let offset = 0;

  return (
    <div
      className="border p-5 rounded-[18px] flex flex-col items-center gap-4"
      style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
    >
      <h3 className="font-extrabold text-[14px] self-start" style={{ color: "var(--vet-text-1)" }}>
        Distribución
      </h3>
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle
            cx="90"
            cy="90"
            r={r}
            fill="none"
            stroke="var(--vet-bg-hover)"
            strokeWidth="22"
          />
          {sum > 0 &&
            cats.map((cat) => {
              const portion = cat.val / sum;
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
                  strokeLinecap="butt"
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
            {total.total}
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

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
      {CATEGORY_META.map((c) => (
        <div key={c.key} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ background: c.color }}
            aria-hidden
          />
          <span className="text-[11px] font-bold" style={{ color: "var(--vet-text-3)" }}>
            {c.label}
          </span>
        </div>
      ))}
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
