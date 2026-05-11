"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Heart,
  Mail,
  Phone,
  Search,
  Sparkles,
  TrendingUp,
  Users as UsersIcon,
  ChevronDown,
} from "lucide-react";
import { SPECIES_EMOJI } from "@/lib/utils";

type Pet = {
  id: string;
  name: string;
  species: string;
  photoUrl: string | null;
};

type ApptLite = {
  id: string;
  status: string;
  scheduledAt: string;
  priceEstimate: number;
  serviceName: string;
};

type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  createdAt: string;
  petCount: number;
  pets: Pet[];
  appointments: ApptLite[];
};

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

type Selection<T extends number | string> = "all" | ReadonlySet<T>;

function formatMxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 3600 * 1000));
  if (days < 0) return `en ${Math.abs(days)}d`;
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days}d`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  if (days < 365) return `hace ${Math.floor(days / 30)} mes`;
  return `hace ${Math.floor(days / 365)} año${days >= 730 ? "s" : ""}`;
}

function inSel<T extends number | string>(s: Selection<T>, v: T) {
  return s === "all" || s.has(v);
}

function periodLabel(
  months: Selection<number>,
  years: Selection<number>
): string {
  if (months === "all" && years === "all") return "Histórico completo";
  if (months === "all" && years !== "all")
    return years.size === 1 ? `Año ${[...years][0]}` : `${years.size} años`;
  if (years === "all" && months !== "all")
    return months.size === 1
      ? `${MONTH_NAMES[[...months][0]]} (todos los años)`
      : `${months.size} meses`;
  if (months !== "all" && years !== "all") {
    if (months.size === 1 && years.size === 1)
      return `${MONTH_NAMES[[...months][0]]} ${[...years][0]}`;
    if (years.size === 1) return `${months.size} meses · ${[...years][0]}`;
    return `${months.size} meses · ${years.size} años`;
  }
  return "Personalizado";
}

export function ClientsDashboard({
  clients,
  totalAppointments,
}: {
  clients: ClientRow[];
  totalAppointments: number;
}) {
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();

  const [months, setMonths] = useState<Selection<number>>(
    new Set([todayMonth])
  );
  const [years, setYears] = useState<Selection<number>>(new Set([todayYear]));

  // Years present in the data
  const availableYears = useMemo(() => {
    const s = new Set<number>([todayYear]);
    for (const c of clients) {
      s.add(new Date(c.createdAt).getFullYear());
      for (const a of c.appointments)
        s.add(new Date(a.scheduledAt).getFullYear());
    }
    return [...s].sort((a, b) => b - a);
  }, [clients, todayYear]);

  // Per-client stats *for the selected period*
  const periodStats = useMemo(() => {
    return clients.map((c) => {
      const apptsInPeriod = c.appointments.filter((a) => {
        const d = new Date(a.scheduledAt);
        return (
          inSel(months, d.getMonth()) && inSel(years, d.getFullYear())
        );
      });
      const completed = apptsInPeriod.filter((a) => a.status === "COMPLETED");
      const spend = completed.reduce((acc, a) => acc + a.priceEstimate, 0);
      const isNew = (() => {
        const cd = new Date(c.createdAt);
        return inSel(months, cd.getMonth()) && inSel(years, cd.getFullYear());
      })();
      return {
        client: c,
        visitsInPeriod: completed.length,
        spendInPeriod: spend,
        anyApptInPeriod: apptsInPeriod.length > 0,
        isNewInPeriod: isNew,
      };
    });
  }, [clients, months, years]);

  // KPIs
  const kpis = useMemo(() => {
    const active = periodStats.filter((p) => p.visitsInPeriod > 0);
    const newClients = periodStats.filter((p) => p.isNewInPeriod);
    const totalVisits = active.reduce(
      (acc, p) => acc + p.visitsInPeriod,
      0
    );
    const totalSpend = active.reduce((acc, p) => acc + p.spendInPeriod, 0);
    const avgVisits =
      active.length > 0 ? Math.round((totalVisits / active.length) * 10) / 10 : 0;
    const top = [...active].sort(
      (a, b) => b.visitsInPeriod - a.visitsInPeriod
    )[0];
    const topSpender = [...active].sort(
      (a, b) => b.spendInPeriod - a.spendInPeriod
    )[0];
    return {
      activeCount: active.length,
      newCount: newClients.length,
      totalVisits,
      totalSpend,
      avgVisits,
      top: top
        ? { name: top.client.name, count: top.visitsInPeriod }
        : null,
      topSpender: topSpender
        ? { name: topSpender.client.name, amount: topSpender.spendInPeriod }
        : null,
    };
  }, [periodStats]);

  // Search across all (not just period) — list shows period chips
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = periodStats;
    if (!showAll) rows = rows.filter((r) => r.anyApptInPeriod);
    if (q) {
      rows = rows.filter((r) => {
        const c = r.client;
        const hay = (
          c.name +
          " " +
          c.email +
          " " +
          c.phone +
          " " +
          c.pets.map((p) => p.name).join(" ")
        ).toLowerCase();
        return hay.includes(q);
      });
    }
    return [...rows].sort((a, b) => b.visitsInPeriod - a.visitsInPeriod);
  }, [periodStats, query, showAll]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1
            className="text-[26px] font-black tracking-tight"
            style={{ color: "var(--vet-text-1)" }}
          >
            Clientes
          </h1>
          <p
            className="text-[13px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            {clients.length} cliente{clients.length === 1 ? "" : "s"} en total ·{" "}
            {totalAppointments} citas en el sistema · viendo{" "}
            {periodLabel(months, years)}.
          </p>
        </div>
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
          onReset={() => {
            setMonths(new Set([todayMonth]));
            setYears(new Set([todayYear]));
          }}
        />
      </div>

      {/* KPIs */}
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Clientes activos"
          value={String(kpis.activeCount)}
          sub={`${kpis.totalVisits} visita${kpis.totalVisits === 1 ? "" : "s"} en el periodo`}
          icon={<UsersIcon size={18} />}
          color="var(--vet-green)"
        />
        <Kpi
          label="Clientes nuevos"
          value={String(kpis.newCount)}
          sub={kpis.newCount > 0 ? "se registraron en el periodo" : "sin altas nuevas"}
          icon={<Sparkles size={18} />}
          color="var(--vet-blue-dim)"
        />
        <Kpi
          label="Visitas promedio"
          value={kpis.avgVisits.toString()}
          sub="por cliente activo"
          icon={<TrendingUp size={18} />}
          color="var(--vet-amber)"
        />
        <Kpi
          label="Ingresos"
          value={formatMxn(kpis.totalSpend)}
          sub={
            kpis.activeCount > 0
              ? `${formatMxn(Math.round(kpis.totalSpend / Math.max(1, kpis.activeCount)))} promedio`
              : "sin ingresos"
          }
          icon={<Heart size={18} />}
          color="var(--vet-violet)"
        />
      </div>

      {/* Highlights */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <Highlight
          label="Cliente con más visitas"
          primary={kpis.top?.name ?? "—"}
          secondary={
            kpis.top
              ? `${kpis.top.count} ${kpis.top.count === 1 ? "visita" : "visitas"} en el periodo`
              : "Sin visitas en el periodo"
          }
          color="var(--vet-green)"
          emoji="🏆"
        />
        <Highlight
          label="Cliente que más invierte"
          primary={kpis.topSpender?.name ?? "—"}
          secondary={
            kpis.topSpender
              ? `${formatMxn(kpis.topSpender.amount)} en el periodo`
              : "Sin pagos en el periodo"
          }
          color="var(--vet-violet)"
          emoji="💎"
        />
      </div>

      {/* Search + toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            color="var(--vet-text-3)"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente, correo, teléfono o mascota…"
            className="w-full h-11 pl-10 pr-3 rounded-[12px] border outline-none text-[14px] font-bold"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-1)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="h-11 px-4 rounded-[10px] border text-[12px] font-extrabold transition-colors whitespace-nowrap"
          style={{
            background: showAll ? "var(--vet-green-glow)" : "var(--vet-bg-card)",
            borderColor: showAll ? "var(--vet-green)" : "var(--vet-border)",
            color: showAll ? "var(--vet-green)" : "var(--vet-text-2)",
          }}
        >
          {showAll
            ? "Mostrando todos los clientes"
            : "Mostrando sólo activos del periodo"}
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2.5">
        {filteredRows.length === 0 ? (
          <div
            className="border-dashed border p-10 rounded-[18px] text-center"
            style={{
              borderColor: "var(--vet-border)",
              background: "var(--vet-bg-mid)",
            }}
          >
            <p
              className="text-[14px] font-extrabold"
              style={{ color: "var(--vet-text-1)" }}
            >
              {showAll
                ? "Sin coincidencias"
                : "Ningún cliente con visitas en el periodo"}
            </p>
            <p
              className="text-[12px] font-semibold mt-1"
              style={{ color: "var(--vet-text-3)" }}
            >
              {showAll
                ? "Prueba con otro nombre o número."
                : "Cambia el periodo o muestra todos los clientes."}
            </p>
          </div>
        ) : (
          filteredRows.map((r) => <Row key={r.client.id} row={r} />)
        )}
      </div>
    </div>
  );
}

/* ─── Bits ────────────────────────────────────────────── */

function Kpi({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="relative overflow-hidden flex flex-col gap-2 p-5 border"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        borderRadius: 20,
      }}
    >
      <div
        aria-hidden
        className="absolute -top-5 -right-5 w-24 h-24 rounded-full opacity-15 blur-xl"
        style={{ background: color }}
      />
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
      <div
        className="text-[24px] font-black leading-tight truncate"
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
    </div>
  );
}

function Highlight({
  label,
  primary,
  secondary,
  color,
  emoji,
}: {
  label: string;
  primary: string;
  secondary: string;
  color: string;
  emoji: string;
}) {
  return (
    <div
      className="border p-4 rounded-[16px] flex items-center gap-3"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: `color-mix(in oklab, ${color} 14%, transparent)` }}
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color: "var(--vet-text-3)" }}
        >
          {label}
        </div>
        <div
          className="text-[15px] font-extrabold truncate"
          style={{ color: "var(--vet-text-1)" }}
        >
          {primary}
        </div>
        <div className="vet-mono text-[12px] font-bold" style={{ color }}>
          {secondary}
        </div>
      </div>
    </div>
  );
}

function Row({
  row,
}: {
  row: {
    client: ClientRow;
    visitsInPeriod: number;
    spendInPeriod: number;
    anyApptInPeriod: boolean;
    isNewInPeriod: boolean;
  };
}) {
  const { client: c, visitsInPeriod, spendInPeriod, isNewInPeriod } = row;
  const [expanded, setExpanded] = useState(false);
  const lastVisit = c.appointments[0] ?? null;

  return (
    <div
      className="border rounded-[16px] overflow-hidden"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-white text-[14px] flex-shrink-0"
          style={{
            background: c.photoUrl
              ? "var(--vet-bg-mid)"
              : "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
          }}
        >
          {c.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.photoUrl}
              alt={c.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>
              {c.name
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("")}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className="text-[14px] font-extrabold truncate"
              style={{ color: "var(--vet-text-1)" }}
            >
              {c.name}
            </p>
            {isNewInPeriod && (
              <span
                className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{
                  background: "var(--vet-green-glow)",
                  color: "var(--vet-green)",
                }}
              >
                Nuevo
              </span>
            )}
          </div>
          <p
            className="text-[12px] font-semibold truncate"
            style={{ color: "var(--vet-text-3)" }}
          >
            {c.pets.length === 0
              ? "Sin mascotas registradas"
              : c.pets
                  .slice(0, 3)
                  .map((p) => `${SPECIES_EMOJI[p.species] ?? "🐾"} ${p.name}`)
                  .join(" · ") +
                (c.pets.length > 3 ? ` +${c.pets.length - 3}` : "")}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Chip
              label={`${visitsInPeriod} ${visitsInPeriod === 1 ? "visita" : "visitas"} en el periodo`}
              color="var(--vet-green)"
            />
            {spendInPeriod > 0 && (
              <Chip label={formatMxn(spendInPeriod)} color="var(--vet-violet)" />
            )}
            <Chip
              label={`${c.appointments.length} totales`}
              color="var(--vet-text-3)"
            />
            {lastVisit && (
              <Chip
                label={`última ${relativeTime(lastVisit.scheduledAt)}`}
                color="var(--vet-text-3)"
              />
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          color="var(--vet-text-3)"
          className="flex-shrink-0"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0)",
            transition: "transform .15s",
          }}
        />
      </button>

      {expanded && (
        <div
          className="border-t px-4 py-4 flex flex-col gap-3"
          style={{
            borderTopColor: "var(--vet-border)",
            background: "var(--vet-bg-mid)",
          }}
        >
          <div className="flex flex-wrap gap-3">
            <a
              href={`mailto:${c.email}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-extrabold no-underline"
              style={{ color: "var(--vet-green)" }}
            >
              <Mail size={12} /> {c.email}
            </a>
            <a
              href={`tel:${c.phone}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-extrabold no-underline"
              style={{ color: "var(--vet-green)" }}
            >
              <Phone size={12} /> {c.phone}
            </a>
            <span
              className="text-[11px] font-semibold inline-flex items-center gap-1"
              style={{ color: "var(--vet-text-3)" }}
            >
              <Calendar size={11} /> Cliente desde {formatDate(c.createdAt)}
            </span>
          </div>

          {c.pets.length > 0 && (
            <div>
              <p
                className="text-[10px] font-extrabold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--vet-text-3)" }}
              >
                Mascotas
              </p>
              <div className="flex flex-wrap gap-2">
                {c.pets.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] border"
                    style={{
                      background: "var(--vet-bg-card)",
                      borderColor: "var(--vet-border)",
                    }}
                  >
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-[14px]">
                        {SPECIES_EMOJI[p.species] ?? "🐾"}
                      </span>
                    )}
                    <span
                      className="text-[12px] font-extrabold"
                      style={{ color: "var(--vet-text-1)" }}
                    >
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastVisit && (
            <div>
              <p
                className="text-[10px] font-extrabold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--vet-text-3)" }}
              >
                Última visita
              </p>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-[10px] border"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                }}
              >
                <span
                  className="text-[12px] font-extrabold"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  {lastVisit.serviceName}
                </span>
                <span
                  className="text-[11px] font-semibold ml-auto"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {formatDate(lastVisit.scheduledAt)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
      style={{
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        color,
      }}
    >
      {label}
    </span>
  );
}

/* ─── Period picker (local copy — same UX as dashboard) ────── */

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

  // Sync draft on open
  useMemo(() => {
    if (open) {
      setDraftMonths(months);
      setDraftYears(years);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3.5 h-10 rounded-[10px] border text-[13px] font-extrabold transition-colors"
        style={{
          background: open ? "var(--vet-bg-mid)" : "var(--vet-bg-card)",
          borderColor: open ? "var(--vet-green)" : "var(--vet-border)",
          color: open ? "var(--vet-green)" : "var(--vet-text-1)",
        }}
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
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute top-[calc(100%+6px)] right-0 z-30 w-[420px] max-w-[calc(100vw-32px)] rounded-[14px] border overflow-hidden"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              boxShadow:
                "0 18px 48px color-mix(in oklab, oklch(20% 0.04 40) 18%, transparent)",
            }}
          >
            <div className="grid grid-cols-2 max-h-[360px]">
              <div
                className="border-r overflow-y-auto"
                style={{ borderRightColor: "var(--vet-border)" }}
              >
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
                {MONTH_NAMES.map((n, i) => (
                  <SelectRow
                    key={i}
                    label={n}
                    active={draftMonths !== "all" && draftMonths.has(i)}
                    onClick={() => toggleMonth(i)}
                  />
                ))}
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
                {availableYears.map((y) => (
                  <SelectRow
                    key={y}
                    label={String(y)}
                    active={draftYears !== "all" && draftYears.has(y)}
                    onClick={() => toggleYear(y)}
                  />
                ))}
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
                className="flex-1 h-10 rounded-[10px] border text-[13px] font-extrabold"
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
        </>
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
      className="w-full flex items-center justify-between px-4 py-2 text-[13px] font-bold text-left"
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
