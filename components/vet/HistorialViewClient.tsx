"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VetIcon } from "./VetIcon";
import { FilterSortBar, type FilterChip, type FilterType, type SortOption } from "./FilterSortBar";

type HistorialItem = {
  id: string;
  date: string;
  status: string;
  priceEstimate: number;
  durationMinutes: number;
  petName: string;
  petSpecies: string;
  clientName: string;
  serviceName: string;
  notes: string | null;
  visitsForPet: number;
};

type StatusKey = "COMPLETED" | "CANCELLED" | "NO_SHOW";
type Category = "consultas" | "cirugias" | "vacunaciones" | "otros";

const STATUS_LABEL: Record<StatusKey, string> = {
  COMPLETED: "Atendidas",
  CANCELLED: "Canceladas",
  NO_SHOW: "No vinieron",
} as never;

const STATUS_COLOR: Record<StatusKey, string> = {
  COMPLETED: "var(--vet-blue)",
  CANCELLED: "var(--vet-red)",
  NO_SHOW: "var(--vet-amber)",
} as never;

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

function formatMxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}
function formatDate(d: Date) {
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

const FILTER_TYPES: FilterType[] = [
  {
    key: "status",
    label: "Estado",
    options: [
      { value: "COMPLETED", label: "Atendidas", color: "var(--vet-blue)" },
      { value: "CANCELLED", label: "Canceladas", color: "var(--vet-red)" },
      { value: "NO_SHOW", label: "No vinieron", color: "var(--vet-amber)" },
    ],
  },
  {
    key: "category",
    label: "Servicio",
    options: CATEGORY_META.map((c) => ({ value: c.key, label: c.label, color: c.color })),
  },
];

const SORT_OPTIONS: SortOption[] = [
  { key: "recent", label: "Más recientes primero" },
  { key: "old", label: "Más antiguas primero" },
  { key: "amountDesc", label: "Mayor ingreso primero" },
  { key: "amountAsc", label: "Menor ingreso primero" },
  { key: "visitsDesc", label: "Más visitas del paciente" },
  { key: "patient", label: "Por paciente (A–Z)" },
  { key: "client", label: "Por cliente (A–Z)" },
];

export function HistorialViewClient({ records }: { records: HistorialItem[] }) {
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [sortKey, setSortKey] = useState("recent");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const activeStatuses = new Set(
    filters.filter((f) => f.type === "status").map((f) => f.value)
  );
  const activeCategories = new Set(
    filters.filter((f) => f.type === "category").map((f) => f.value)
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (activeStatuses.size > 0 && !activeStatuses.has(r.status)) return false;
      if (
        activeCategories.size > 0 &&
        !activeCategories.has(categoryFor(r.serviceName))
      )
        return false;
      if (q) {
        const hay = `${r.petName} ${r.clientName} ${r.serviceName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, activeStatuses, activeCategories, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "old":
        arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "amountDesc":
        arr.sort((a, b) => b.priceEstimate - a.priceEstimate);
        break;
      case "amountAsc":
        arr.sort((a, b) => a.priceEstimate - b.priceEstimate);
        break;
      case "visitsDesc":
        arr.sort(
          (a, b) =>
            b.visitsForPet - a.visitsForPet ||
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        break;
      case "patient":
        arr.sort((a, b) => a.petName.localeCompare(b.petName));
        break;
      case "client":
        arr.sort((a, b) => a.clientName.localeCompare(b.clientName));
        break;
      case "recent":
      default:
        arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return arr;
  }, [filtered, sortKey]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE) || 1;
  const visible = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters/search/sort change
  const filterSig = `${filters.length}-${sortKey}-${search}`;
  useResetPage(filterSig, () => setPage(0));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2
          className="text-[22px] font-black tracking-tight"
          style={{ color: "var(--vet-text-1)" }}
        >
          Historial Clínico
        </h2>
        <div className="text-[13px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
          {records.length === 0
            ? "Sin registros aún"
            : `${records.length} ${records.length === 1 ? "registro" : "registros"} en los últimos 12 meses`}
        </div>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 border"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 12,
        }}
      >
        <VetIcon name="search" size={16} color="var(--vet-text-3)" />
        <input
          type="text"
          placeholder="Buscar por paciente, cliente o servicio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[14px] font-semibold"
          style={{ color: "var(--vet-text-1)" }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-[11px] font-extrabold"
            style={{ color: "var(--vet-text-3)" }}
          >
            Limpiar
          </button>
        )}
      </div>

      <FilterSortBar
        filterTypes={FILTER_TYPES}
        filters={filters}
        onAddFilter={(c) => setFilters((p) => [...p, c])}
        onRemoveFilter={(c) =>
          setFilters((p) => p.filter((f) => !(f.type === c.type && f.value === c.value)))
        }
        sortOptions={SORT_OPTIONS}
        sortKey={sortKey}
        defaultSortKey="recent"
        onSortChange={setSortKey}
      />

      {/* Results count */}
      <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
        Mostrando {sorted.length} {sorted.length === 1 ? "cita" : "citas"}
        {(filters.length > 0 || search) && " (con filtros aplicados)"}
      </div>

      {sorted.length === 0 ? (
        <div
          className="py-14 text-center border"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            borderRadius: 22,
            color: "var(--vet-text-3)",
          }}
        >
          <div className="text-[14px] font-bold" style={{ color: "var(--vet-text-2)" }}>
            Ninguna cita coincide
          </div>
          <div className="text-[12px] font-semibold mt-1">
            Quita filtros o cambia la búsqueda.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((r) => {
            const status = r.status as StatusKey;
            const d = new Date(r.date);
            return (
              <Link
                key={r.id}
                href={`/vet/cita/${r.id}`}
                className="flex items-start gap-4 px-5 py-4 border no-underline transition-colors hover:[border-color:var(--vet-green)]"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  borderRadius: 14,
                  color: "var(--vet-text-1)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `color-mix(in oklab, ${STATUS_COLOR[status] ?? "var(--vet-text-3)"} 15%, transparent)`,
                  }}
                >
                  <VetIcon name="records" size={18} color={STATUS_COLOR[status] ?? "var(--vet-text-3)"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
                      {r.petName}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--vet-text-3)" }}>·</span>
                    <span className="text-[12px] font-semibold" style={{ color: "var(--vet-text-2)" }}>
                      {r.clientName}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-extrabold"
                      style={{
                        background: `color-mix(in oklab, ${STATUS_COLOR[status]} 15%, transparent)`,
                        color: STATUS_COLOR[status],
                      }}
                    >
                      {r.serviceName}
                    </span>
                    <span
                      className="ml-auto vet-mono text-[12px] font-extrabold whitespace-nowrap"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      {formatDate(d)} · {formatTime(d)}
                    </span>
                  </div>
                  <div
                    className="text-[13px] leading-snug font-semibold line-clamp-2"
                    style={{ color: "var(--vet-text-2)" }}
                  >
                    {r.notes ?? "Sin notas registradas."}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span
                      className="text-[11px] font-bold uppercase"
                      style={{ color: STATUS_COLOR[status] }}
                    >
                      {STATUS_LABEL[status] ?? status}
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                      {r.durationMinutes} min
                    </span>
                    {r.visitsForPet > 1 && (
                      <span className="text-[11px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                        {r.visitsForPet} visitas en total
                      </span>
                    )}
                    <span
                      className="ml-auto vet-mono text-[13px] font-extrabold"
                      style={{ color: "var(--vet-text-1)" }}
                    >
                      {formatMxn(r.priceEstimate)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3 border rounded-[14px]"
              style={{ borderColor: "var(--vet-border)", background: "var(--vet-bg-card)" }}
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
      )}
    </div>
  );
}

function useResetPage(sig: string, reset: () => void) {
  const [last, setLast] = useState(sig);
  if (last !== sig) {
    setLast(sig);
    reset();
  }
}
