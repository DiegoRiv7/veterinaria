"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SPECIES_EMOJI } from "@/lib/utils";
import { VetIcon } from "./VetIcon";
import { FilterSortBar, type FilterChip, type FilterType, type SortOption } from "./FilterSortBar";

type PetRow = {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  weight: string;
  owner: string;
  lastVisit: string;
  /** Sortable timestamp for last visit (ISO string or empty) */
  lastVisitAt?: string | null;
  visitCount?: number;
};

const SPECIES_TINT: Record<string, string> = {
  DOG: "#f4a460",
  CAT: "#b19cd9",
  BIRD: "#90ee90",
  RABBIT: "#d3d3d3",
  HAMSTER: "#ffd180",
  REPTILE: "#ffd700",
  OTHER: "#a0c4ff",
};

const SPECIES_LABEL_FILTER: Record<string, string> = {
  DOG: "Perros",
  CAT: "Gatos",
  BIRD: "Aves",
  RABBIT: "Conejos",
  HAMSTER: "Hámsters",
  REPTILE: "Reptiles",
  OTHER: "Otros",
};

const FILTER_TYPES: FilterType[] = [
  {
    key: "species",
    label: "Especie",
    options: Object.entries(SPECIES_LABEL_FILTER).map(([value, label]) => ({
      value,
      label,
      color: SPECIES_TINT[value],
    })),
  },
];

const SORT_OPTIONS: SortOption[] = [
  { key: "name", label: "Por nombre (A–Z)" },
  { key: "recentVisit", label: "Última visita reciente" },
  { key: "visitsDesc", label: "Más visitas primero" },
  { key: "species", label: "Por especie" },
];

export function PatientsViewClient({ pets }: { pets: PetRow[] }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [sortKey, setSortKey] = useState("name");

  const activeSpecies = new Set(
    filters.filter((f) => f.type === "species").map((f) => f.value)
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pets.filter((p) => {
      if (activeSpecies.size > 0 && !activeSpecies.has(p.species)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q)
      );
    });
  }, [pets, activeSpecies, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "recentVisit":
        arr.sort((a, b) => {
          const at = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0;
          const bt = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0;
          return bt - at;
        });
        break;
      case "visitsDesc":
        arr.sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0));
        break;
      case "species":
        arr.sort((a, b) => a.species.localeCompare(b.species) || a.name.localeCompare(b.name));
        break;
      case "name":
      default:
        arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return arr;
  }, [filtered, sortKey]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-black tracking-tight" style={{ color: "var(--vet-text-1)" }}>
          Pacientes
        </h2>
        <div className="text-[13px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
          {pets.length} {pets.length === 1 ? "paciente registrado" : "pacientes registrados"}
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
          placeholder="Buscar por nombre, dueño o raza..."
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
        defaultSortKey="name"
        onSortChange={setSortKey}
      />

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
            {search || filters.length ? "Ningún paciente coincide" : "Sin pacientes registrados"}
          </div>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        >
          {sorted.map((p) => {
            const tint = SPECIES_TINT[p.species] ?? "#a0c4ff";
            return (
              <Link
                key={p.id}
                href={`/vet/pacientes/${p.id}`}
                className="border p-4 transition-transform no-underline hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  borderRadius: 22,
                  color: "var(--vet-text-1)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2"
                    style={{ background: `${tint}33`, borderColor: `${tint}77` }}
                  >
                    {SPECIES_EMOJI[p.species] ?? "🐾"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-[16px] truncate" style={{ color: "var(--vet-text-1)" }}>
                      {p.name}
                    </div>
                    <div className="text-[12px] font-semibold truncate" style={{ color: "var(--vet-text-3)" }}>
                      {p.breed}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 mb-2.5">
                  {[
                    { l: "Edad", v: p.age },
                    { l: "Peso", v: p.weight },
                  ].map((it) => (
                    <div
                      key={it.l}
                      className="flex-1 rounded-lg py-1.5 text-center"
                      style={{ background: "var(--vet-bg-mid)" }}
                    >
                      <div className="text-[11px] font-bold" style={{ color: "var(--vet-text-3)" }}>
                        {it.l}
                      </div>
                      <div className="vet-mono text-[13px] font-extrabold" style={{ color: "var(--vet-text-1)" }}>
                        {it.v}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                  👤 {p.owner}
                </div>
                <div className="text-[11px] font-semibold mt-1 flex items-center justify-between" style={{ color: "var(--vet-text-3)" }}>
                  <span>
                    Última visita: <span style={{ color: "var(--vet-green)" }}>{p.lastVisit}</span>
                  </span>
                  {p.visitCount && p.visitCount > 0 && (
                    <span className="vet-mono font-extrabold" style={{ color: "var(--vet-text-2)" }}>
                      {p.visitCount}{p.visitCount === 1 ? " visita" : " visitas"}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
