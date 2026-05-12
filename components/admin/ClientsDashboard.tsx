"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronDown,
  Heart,
  Mail,
  Phone,
  Search,
  Sparkles,
  TrendingUp,
  Users as UsersIcon,
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
      topId: top?.client.id ?? null,
      topSpender: topSpender
        ? { name: topSpender.client.name, amount: topSpender.spendInPeriod }
        : null,
      topSpenderId: topSpender?.client.id ?? null,
    };
  }, [periodStats]);

  // Search across all (not just period) — list shows period chips
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Active drill-down: either a KPI or a specific client detail
  type View =
    | { kind: "kpi"; key: "active" | "new" | "avg" | "revenue" }
    | { kind: "client"; id: string }
    | null;
  const [view, setView] = useState<View>(null);

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

      {/* KPIs — clickables, abren detalle abajo */}
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Clientes activos"
          value={String(kpis.activeCount)}
          sub={`${kpis.totalVisits} visita${kpis.totalVisits === 1 ? "" : "s"} en el periodo`}
          icon={<UsersIcon size={18} />}
          color="var(--vet-green)"
          active={view?.kind === "kpi" && view.key === "active"}
          onClick={() =>
            setView((v) =>
              v?.kind === "kpi" && v.key === "active"
                ? null
                : { kind: "kpi", key: "active" }
            )
          }
        />
        <Kpi
          label="Clientes nuevos"
          value={String(kpis.newCount)}
          sub={kpis.newCount > 0 ? "se registraron en el periodo" : "sin altas nuevas"}
          icon={<Sparkles size={18} />}
          color="var(--vet-blue-dim)"
          active={view?.kind === "kpi" && view.key === "new"}
          onClick={() =>
            setView((v) =>
              v?.kind === "kpi" && v.key === "new"
                ? null
                : { kind: "kpi", key: "new" }
            )
          }
        />
        <Kpi
          label="Visitas promedio"
          value={kpis.avgVisits.toString()}
          sub="por cliente activo"
          icon={<TrendingUp size={18} />}
          color="var(--vet-amber)"
          active={view?.kind === "kpi" && view.key === "avg"}
          onClick={() =>
            setView((v) =>
              v?.kind === "kpi" && v.key === "avg"
                ? null
                : { kind: "kpi", key: "avg" }
            )
          }
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
          active={view?.kind === "kpi" && view.key === "revenue"}
          onClick={() =>
            setView((v) =>
              v?.kind === "kpi" && v.key === "revenue"
                ? null
                : { kind: "kpi", key: "revenue" }
            )
          }
        />
      </div>

      {/* Highlights — abren detalle del cliente al darle clic */}
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
          clientId={kpis.topId}
          onClick={(id) => setView({ kind: "client", id })}
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
          clientId={kpis.topSpenderId}
          onClick={(id) => setView({ kind: "client", id })}
        />
      </div>

      {/* Detalle activo (KPI o cliente) o lista normal */}
      {view ? (
        <DetailPanel
          view={view}
          periodStats={periodStats}
          months={months}
          years={years}
          onBack={() => setView(null)}
          onSelectClient={(id) => setView({ kind: "client", id })}
        />
      ) : (
      <>
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
      </>
      )}
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
  active,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
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
    </button>
  );
}

function Highlight({
  label,
  primary,
  secondary,
  color,
  emoji,
  clientId,
  onClick,
}: {
  label: string;
  primary: string;
  secondary: string;
  color: string;
  emoji: string;
  clientId: string | null;
  onClick: (id: string) => void;
}) {
  const disabled = !clientId;
  const handle = () => {
    if (clientId) onClick(clientId);
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      className="border p-4 rounded-[16px] flex items-center gap-3 text-left transition-all enabled:hover:-translate-y-0.5"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        opacity: disabled ? 0.65 : 1,
        cursor: disabled ? "default" : "pointer",
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
      {!disabled && (
        <span
          className="text-[10px] font-extrabold inline-flex items-center px-1.5 py-0.5 rounded-full"
          style={{
            background: `color-mix(in oklab, ${color} 14%, transparent)`,
            color,
            border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
          }}
        >
          Ver perfil →
        </span>
      )}
    </button>
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

/* ─── Detail Panel (KPI drill-down + Client detail) ────── */

type PeriodStat = {
  client: ClientRow;
  visitsInPeriod: number;
  spendInPeriod: number;
  anyApptInPeriod: boolean;
  isNewInPeriod: boolean;
};

function DetailPanel({
  view,
  periodStats,
  months,
  years,
  onBack,
  onSelectClient,
}: {
  view:
    | { kind: "kpi"; key: "active" | "new" | "avg" | "revenue" }
    | { kind: "client"; id: string };
  periodStats: PeriodStat[];
  months: Selection<number>;
  years: Selection<number>;
  onBack: () => void;
  onSelectClient: (id: string) => void;
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
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] border text-[12px] font-extrabold"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-2)",
          }}
        >
          <ChevronLeft size={14} />
          Volver
        </button>
        <h2
          className="font-extrabold text-[15px]"
          style={{ color: "var(--vet-text-1)" }}
        >
          {view.kind === "kpi" && view.key === "active" && "Clientes activos en el periodo"}
          {view.kind === "kpi" && view.key === "new" && "Clientes nuevos en el periodo"}
          {view.kind === "kpi" && view.key === "avg" && "Distribución de visitas"}
          {view.kind === "kpi" && view.key === "revenue" && "Ranking por ingresos"}
          {view.kind === "client" && "Perfil del cliente"}
        </h2>
      </div>

      <div className="p-5">
        {view.kind === "kpi" && view.key === "active" && (
          <ActiveClientsTable
            periodStats={periodStats}
            onSelectClient={onSelectClient}
          />
        )}
        {view.kind === "kpi" && view.key === "new" && (
          <NewClientsTable
            periodStats={periodStats}
            months={months}
            years={years}
            onSelectClient={onSelectClient}
          />
        )}
        {view.kind === "kpi" && view.key === "avg" && (
          <VisitDistribution periodStats={periodStats} />
        )}
        {view.kind === "kpi" && view.key === "revenue" && (
          <RevenueRanking
            periodStats={periodStats}
            onSelectClient={onSelectClient}
          />
        )}
        {view.kind === "client" && (
          <ClientProfile
            stat={
              periodStats.find((p) => p.client.id === view.id) ?? null
            }
            months={months}
            years={years}
          />
        )}
      </div>
    </section>
  );
}

function ActiveClientsTable({
  periodStats,
  onSelectClient,
}: {
  periodStats: PeriodStat[];
  onSelectClient: (id: string) => void;
}) {
  const rows = [...periodStats]
    .filter((p) => p.visitsInPeriod > 0)
    .sort((a, b) => b.visitsInPeriod - a.visitsInPeriod);
  if (rows.length === 0)
    return <EmptyTable label="Sin clientes activos en el periodo." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ background: "var(--vet-bg-mid)" }}>
            <Th>#</Th>
            <Th>Cliente</Th>
            <Th align="right">Visitas</Th>
            <Th align="right">Mascotas</Th>
            <Th align="right">Ingresos</Th>
            <Th align="right">Última visita</Th>
            <Th align="right">&nbsp;</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const lastVisit = r.client.appointments[0] ?? null;
            return (
              <tr
                key={r.client.id}
                style={{ borderTop: "1px solid var(--vet-border)" }}
              >
                <Td muted>{i + 1}</Td>
                <Td strong>{r.client.name}</Td>
                <Td
                  align="right"
                  className="vet-mono"
                  strong
                  style={{ color: "var(--vet-green)" }}
                >
                  {r.visitsInPeriod}
                </Td>
                <Td align="right" className="vet-mono">
                  {r.client.petCount}
                </Td>
                <Td align="right" className="vet-mono" strong>
                  {formatMxn(r.spendInPeriod)}
                </Td>
                <Td align="right" muted>
                  {lastVisit ? relativeTime(lastVisit.scheduledAt) : "—"}
                </Td>
                <Td align="right">
                  <button
                    type="button"
                    onClick={() => onSelectClient(r.client.id)}
                    className="text-[11px] font-extrabold"
                    style={{ color: "var(--vet-green)" }}
                  >
                    Perfil →
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NewClientsTable({
  periodStats,
  onSelectClient,
}: {
  periodStats: PeriodStat[];
  months: Selection<number>;
  years: Selection<number>;
  onSelectClient: (id: string) => void;
}) {
  const rows = periodStats
    .filter((p) => p.isNewInPeriod)
    .sort(
      (a, b) =>
        new Date(b.client.createdAt).getTime() -
        new Date(a.client.createdAt).getTime()
    );
  if (rows.length === 0)
    return <EmptyTable label="Sin altas nuevas en el periodo." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ background: "var(--vet-bg-mid)" }}>
            <Th>#</Th>
            <Th>Cliente</Th>
            <Th>Contacto</Th>
            <Th align="right">Mascotas</Th>
            <Th align="right">Fecha de alta</Th>
            <Th align="right">Primera visita</Th>
            <Th align="right">&nbsp;</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const firstVisit =
              r.client.appointments[r.client.appointments.length - 1] ?? null;
            return (
              <tr
                key={r.client.id}
                style={{ borderTop: "1px solid var(--vet-border)" }}
              >
                <Td muted>{i + 1}</Td>
                <Td strong>{r.client.name}</Td>
                <Td muted>{r.client.email}</Td>
                <Td align="right" className="vet-mono">
                  {r.client.petCount}
                </Td>
                <Td align="right" muted>
                  {formatDate(r.client.createdAt)}
                </Td>
                <Td align="right" muted>
                  {firstVisit ? formatDate(firstVisit.scheduledAt) : "Sin visita aún"}
                </Td>
                <Td align="right">
                  <button
                    type="button"
                    onClick={() => onSelectClient(r.client.id)}
                    className="text-[11px] font-extrabold"
                    style={{ color: "var(--vet-green)" }}
                  >
                    Perfil →
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VisitDistribution({
  periodStats,
}: {
  periodStats: PeriodStat[];
}) {
  const active = periodStats.filter((p) => p.visitsInPeriod > 0);
  if (active.length === 0)
    return <EmptyTable label="Sin visitas en el periodo." />;
  // Buckets: 1, 2, 3, 4, 5+
  const buckets = [
    { label: "1 visita", count: 0 },
    { label: "2 visitas", count: 0 },
    { label: "3 visitas", count: 0 },
    { label: "4 visitas", count: 0 },
    { label: "5+ visitas", count: 0 },
  ];
  for (const p of active) {
    const i = Math.min(p.visitsInPeriod - 1, 4);
    buckets[i].count++;
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="flex flex-col gap-3">
      <p
        className="text-[12px] font-semibold"
        style={{ color: "var(--vet-text-3)" }}
      >
        Cuántos clientes hicieron cada cantidad de visitas durante el periodo.
      </p>
      <div className="flex flex-col gap-2.5">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <div
              className="w-24 text-[12px] font-extrabold text-right"
              style={{ color: "var(--vet-text-1)" }}
            >
              {b.label}
            </div>
            <div
              className="flex-1 h-7 rounded-[6px] relative overflow-hidden"
              style={{ background: "var(--vet-bg-hover)" }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-[6px]"
                style={{
                  width: `${(b.count / max) * 100}%`,
                  background:
                    "linear-gradient(90deg, var(--vet-amber), oklch(58% 0.16 45))",
                }}
              />
            </div>
            <div
              className="w-12 text-right vet-mono text-[13px] font-extrabold"
              style={{ color: "var(--vet-amber)" }}
            >
              {b.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueRanking({
  periodStats,
  onSelectClient,
}: {
  periodStats: PeriodStat[];
  onSelectClient: (id: string) => void;
}) {
  const rows = [...periodStats]
    .filter((p) => p.spendInPeriod > 0)
    .sort((a, b) => b.spendInPeriod - a.spendInPeriod);
  if (rows.length === 0)
    return <EmptyTable label="Sin ingresos en el periodo." />;
  const total = rows.reduce((acc, p) => acc + p.spendInPeriod, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ background: "var(--vet-bg-mid)" }}>
            <Th>#</Th>
            <Th>Cliente</Th>
            <Th align="right">Visitas</Th>
            <Th align="right">Ingresos</Th>
            <Th align="right">% del total</Th>
            <Th align="right">&nbsp;</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.client.id}
              style={{ borderTop: "1px solid var(--vet-border)" }}
            >
              <Td muted>{i + 1}</Td>
              <Td strong>{r.client.name}</Td>
              <Td align="right" className="vet-mono">
                {r.visitsInPeriod}
              </Td>
              <Td
                align="right"
                className="vet-mono"
                strong
                style={{ color: "var(--vet-violet)" }}
              >
                {formatMxn(r.spendInPeriod)}
              </Td>
              <Td align="right" className="vet-mono" muted>
                {((r.spendInPeriod / total) * 100).toFixed(1)}%
              </Td>
              <Td align="right">
                <button
                  type="button"
                  onClick={() => onSelectClient(r.client.id)}
                  className="text-[11px] font-extrabold"
                  style={{ color: "var(--vet-green)" }}
                >
                  Perfil →
                </button>
              </Td>
            </tr>
          ))}
          <tr
            style={{
              borderTop: "2px solid var(--vet-border)",
              background: "var(--vet-bg-mid)",
            }}
          >
            <Td muted>—</Td>
            <Td strong colSpan={2}>
              Total
            </Td>
            <Td
              align="right"
              className="vet-mono"
              strong
              style={{ color: "var(--vet-violet)" }}
            >
              {formatMxn(total)}
            </Td>
            <Td muted>100%</Td>
            <Td muted>—</Td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ClientProfile({
  stat,
  months,
  years,
}: {
  stat: PeriodStat | null;
  months: Selection<number>;
  years: Selection<number>;
}) {
  if (!stat) return <EmptyTable label="Cliente no encontrado." />;
  const c = stat.client;
  const apptsInPeriod = c.appointments.filter((a) => {
    const d = new Date(a.scheduledAt);
    return inSel(months, d.getMonth()) && inSel(years, d.getFullYear());
  });
  const allCompleted = c.appointments.filter((a) => a.status === "COMPLETED");
  const allRevenue = allCompleted.reduce((acc, a) => acc + a.priceEstimate, 0);
  const lastVisit = c.appointments[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-white text-[18px] flex-shrink-0"
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
          <p
            className="text-[20px] font-black truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            {c.name}
          </p>
          <p
            className="text-[12px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            Cliente desde {formatDate(c.createdAt)}
          </p>
          <div className="flex gap-3 mt-2 flex-wrap">
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
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          label="Visitas en periodo"
          value={String(stat.visitsInPeriod)}
          color="var(--vet-green)"
        />
        <MiniStat
          label="Gasto en periodo"
          value={formatMxn(stat.spendInPeriod)}
          color="var(--vet-violet)"
        />
        <MiniStat
          label="Visitas históricas"
          value={String(allCompleted.length)}
          color="var(--vet-blue-dim)"
        />
        <MiniStat
          label="Gasto histórico"
          value={formatMxn(allRevenue)}
          color="var(--vet-amber)"
        />
      </div>

      {/* Pets */}
      {c.pets.length > 0 && (
        <div>
          <p
            className="text-[10px] font-extrabold uppercase tracking-wider mb-2"
            style={{ color: "var(--vet-text-3)" }}
          >
            Mascotas ({c.pets.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {c.pets.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-2 rounded-[10px] border"
                style={{
                  background: "var(--vet-bg-mid)",
                  borderColor: "var(--vet-border)",
                }}
              >
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-[18px]">
                    {SPECIES_EMOJI[p.species] ?? "🐾"}
                  </span>
                )}
                <span
                  className="text-[13px] font-extrabold"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visits in period */}
      <div>
        <p
          className="text-[10px] font-extrabold uppercase tracking-wider mb-2"
          style={{ color: "var(--vet-text-3)" }}
        >
          Citas en el periodo ({apptsInPeriod.length})
        </p>
        {apptsInPeriod.length === 0 ? (
          <p
            className="text-[12px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            No tuvo citas en el periodo seleccionado.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {apptsInPeriod.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 px-3 py-2 rounded-[10px] border"
                style={{
                  background: "var(--vet-bg-mid)",
                  borderColor: "var(--vet-border)",
                }}
              >
                <span
                  className="text-[12px] font-extrabold flex-1 truncate"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  {a.serviceName}
                </span>
                <span
                  className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{
                    background:
                      a.status === "COMPLETED"
                        ? "var(--vet-green-glow)"
                        : a.status === "CANCELLED" || a.status === "NO_SHOW"
                        ? "color-mix(in oklab, var(--vet-red) 14%, transparent)"
                        : "var(--vet-bg-hover)",
                    color:
                      a.status === "COMPLETED"
                        ? "var(--vet-green)"
                        : a.status === "CANCELLED" || a.status === "NO_SHOW"
                        ? "var(--vet-red)"
                        : "var(--vet-text-3)",
                  }}
                >
                  {a.status}
                </span>
                <span
                  className="vet-mono text-[12px] font-bold w-20 text-right"
                  style={{ color: "var(--vet-text-2)" }}
                >
                  {formatMxn(a.priceEstimate)}
                </span>
                <span
                  className="text-[11px] font-semibold w-24 text-right"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {formatDate(a.scheduledAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last historical visit */}
      {lastVisit && (
        <div>
          <p
            className="text-[10px] font-extrabold uppercase tracking-wider mb-2"
            style={{ color: "var(--vet-text-3)" }}
          >
            Última visita registrada
          </p>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[10px] border"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
            }}
          >
            <span
              className="text-[12px] font-extrabold flex-1 truncate"
              style={{ color: "var(--vet-text-1)" }}
            >
              {lastVisit.serviceName}
            </span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: "var(--vet-text-3)" }}
            >
              {formatDate(lastVisit.scheduledAt)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-[12px] p-3 border"
      style={{
        background: "var(--vet-bg-mid)",
        borderColor: "var(--vet-border)",
      }}
    >
      <p
        className="vet-mono text-[18px] font-bold leading-tight"
        style={{ color }}
      >
        {value}
      </p>
      <p
        className="text-[10px] font-extrabold uppercase tracking-wider mt-0.5"
        style={{ color: "var(--vet-text-3)" }}
      >
        {label}
      </p>
    </div>
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
      className={`px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider ${
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
      className={`px-3 py-2.5 ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}
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
      className="px-5 py-10 text-center text-[13px] font-semibold"
      style={{ color: "var(--vet-text-3)" }}
    >
      {label}
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
