"use client";

import { useState, useMemo } from "react";
import { Search, ChevronRight, Phone, Mail } from "lucide-react";
import { SPECIES_EMOJI } from "@/lib/utils";

type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  createdAt: string;
  petCount: number;
  pets: { id: string; name: string; species: string; photoUrl: string | null }[];
  totalAppts: number;
  completedAppts: number;
  monthAppts: number;
  totalSpent: number;
  lastVisit: { date: string; service: string; status: string } | null;
};

type Totals = {
  clients: number;
  appointments: number;
  revenue: number;
  topClient: { name: string; count: number } | null;
  topSpender: { name: string; amount: number } | null;
};

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

type SortKey = "name" | "totalAppts" | "totalSpent" | "lastVisit" | "petCount";

export function ClientsListClient({
  clients,
  totals,
}: {
  clients: ClientRow[];
  totals: Totals;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalAppts");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = clients;
    if (q) {
      rows = clients.filter((c) => {
        const haystack = (
          c.name +
          " " +
          c.email +
          " " +
          c.phone +
          " " +
          c.pets.map((p) => p.name).join(" ")
        ).toLowerCase();
        return haystack.includes(q);
      });
    }
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "totalAppts") cmp = a.totalAppts - b.totalAppts;
      else if (sortKey === "totalSpent") cmp = a.totalSpent - b.totalSpent;
      else if (sortKey === "petCount") cmp = a.petCount - b.petCount;
      else if (sortKey === "lastVisit") {
        const at = a.lastVisit?.date ? new Date(a.lastVisit.date).getTime() : 0;
        const bt = b.lastVisit?.date ? new Date(b.lastVisit.date).getTime() : 0;
        cmp = at - bt;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [clients, query, sortKey, sortDir]);

  function setSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5">
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
          {totals.clients} cliente{totals.clients === 1 ? "" : "s"} ·{" "}
          {totals.appointments} cita{totals.appointments === 1 ? "" : "s"} en
          total · {formatMxn(totals.revenue)} ingresos acumulados.
        </p>
      </div>

      {/* Highlights */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <Highlight
          label="Cliente con más visitas"
          primary={totals.topClient?.name ?? "—"}
          secondary={
            totals.topClient
              ? `${totals.topClient.count} cita${totals.topClient.count === 1 ? "" : "s"} atendidas`
              : "Sin datos"
          }
          color="var(--vet-green)"
        />
        <Highlight
          label="Cliente que más invierte"
          primary={totals.topSpender?.name ?? "—"}
          secondary={
            totals.topSpender
              ? `${formatMxn(totals.topSpender.amount)} en total`
              : "Sin datos"
          }
          color="var(--vet-violet)"
        />
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            color="var(--vet-text-3)"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono o mascota…"
            className="w-full h-11 pl-10 pr-3 rounded-[12px] border outline-none text-[14px] font-bold"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-1)",
            }}
          />
        </div>
        <div className="flex gap-1">
          {(
            [
              ["totalAppts", "Visitas"],
              ["totalSpent", "Gasto"],
              ["lastVisit", "Reciente"],
              ["name", "Nombre"],
            ] as [SortKey, string][]
          ).map(([k, label]) => {
            const active = sortKey === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                className="px-3 h-11 rounded-[10px] text-[12px] font-extrabold border whitespace-nowrap transition-colors"
                style={{
                  background: active
                    ? "var(--vet-green-glow)"
                    : "var(--vet-bg-card)",
                  borderColor: active
                    ? "var(--vet-green)"
                    : "var(--vet-border)",
                  color: active ? "var(--vet-green)" : "var(--vet-text-2)",
                }}
              >
                {label}
                {active && (
                  <span className="ml-1 text-[9px]">
                    {sortDir === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2.5">
        {filtered.length === 0 ? (
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
              Sin coincidencias
            </p>
            <p
              className="text-[12px] font-semibold mt-1"
              style={{ color: "var(--vet-text-3)" }}
            >
              Prueba con otro nombre o número.
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <ClientRow
              key={c.id}
              c={c}
              expanded={expanded.has(c.id)}
              onToggle={() => toggle(c.id)}
            />
          ))
        )}
      </div>
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
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: `color-mix(in oklab, ${color} 14%, transparent)` }}
      >
        🏆
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
        <div
          className="vet-mono text-[12px] font-bold"
          style={{ color }}
        >
          {secondary}
        </div>
      </div>
    </div>
  );
}

function ClientRow({
  c,
  expanded,
  onToggle,
}: {
  c: ClientRow;
  expanded: boolean;
  onToggle: () => void;
}) {
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
        onClick={onToggle}
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
          <p
            className="text-[14px] font-extrabold truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            {c.name}
          </p>
          <p
            className="text-[12px] font-semibold truncate"
            style={{ color: "var(--vet-text-3)" }}
          >
            {c.pets.length === 0
              ? "Sin mascotas registradas"
              : c.pets
                  .slice(0, 3)
                  .map(
                    (p) =>
                      `${SPECIES_EMOJI[p.species] ?? "🐾"} ${p.name}`
                  )
                  .join(" · ") +
                (c.pets.length > 3 ? ` +${c.pets.length - 3}` : "")}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Chip
              label={`${c.totalAppts} ${c.totalAppts === 1 ? "cita" : "citas"}`}
              color="var(--vet-text-1)"
            />
            <Chip
              label={`${c.completedAppts} atendidas`}
              color="var(--vet-blue)"
            />
            {c.totalSpent > 0 && (
              <Chip
                label={formatMxn(c.totalSpent)}
                color="var(--vet-violet)"
              />
            )}
            {c.lastVisit && (
              <Chip
                label={`última ${relativeTime(c.lastVisit.date)}`}
                color="var(--vet-text-3)"
              />
            )}
          </div>
        </div>
        <ChevronRight
          size={18}
          color="var(--vet-text-3)"
          className="flex-shrink-0"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0)",
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
          {/* Contact */}
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
              className="text-[11px] font-semibold"
              style={{ color: "var(--vet-text-3)" }}
            >
              Cliente desde {formatDate(c.createdAt)}
            </span>
          </div>

          {/* Pets */}
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

          {/* Last visit */}
          {c.lastVisit && (
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
                  {c.lastVisit.service}
                </span>
                <span
                  className="text-[11px] font-semibold ml-auto"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {formatDate(c.lastVisit.date)}
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
