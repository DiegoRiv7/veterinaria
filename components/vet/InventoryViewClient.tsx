"use client";

import { useMemo, useState } from "react";
import { FilterSortBar, type FilterChip, type FilterType, type SortOption } from "./FilterSortBar";

type Item = {
  name: string;
  cat: string;
  current: number;
  min: number;
  unit: string;
  exp: string;
  /** YYYY-MM for sorting; "—" if no expiry */
  expSort: string;
  critical: boolean;
};

const FILTER_TYPES: FilterType[] = [
  {
    key: "status",
    label: "Estado",
    options: [
      { value: "low", label: "Bajo stock", color: "var(--vet-red)" },
      { value: "ok", label: "OK", color: "var(--vet-green)" },
    ],
  },
  {
    key: "category",
    label: "Categoría",
    options: [
      { value: "Vacunas", label: "Vacunas", color: "var(--vet-violet)" },
      { value: "Antibióticos", label: "Antibióticos", color: "var(--vet-blue)" },
      { value: "Anestesia", label: "Anestesia", color: "var(--vet-amber)" },
      { value: "Fluidoterapia", label: "Fluidoterapia", color: "var(--vet-green)" },
      { value: "Insumos", label: "Insumos", color: "var(--vet-text-3)" },
    ],
  },
];

const SORT_OPTIONS: SortOption[] = [
  { key: "name", label: "Por nombre (A–Z)" },
  { key: "stockAsc", label: "Menor stock primero" },
  { key: "stockDesc", label: "Mayor stock primero" },
  { key: "expSoon", label: "Vencimiento próximo" },
  { key: "category", label: "Por categoría" },
];

export function InventoryViewClient({ items }: { items: Item[] }) {
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [sortKey, setSortKey] = useState("name");

  const activeStatuses = new Set(
    filters.filter((f) => f.type === "status").map((f) => f.value)
  );
  const activeCategories = new Set(
    filters.filter((f) => f.type === "category").map((f) => f.value)
  );

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (activeStatuses.size > 0) {
        const matches =
          (activeStatuses.has("low") && it.critical) ||
          (activeStatuses.has("ok") && !it.critical);
        if (!matches) return false;
      }
      if (activeCategories.size > 0 && !activeCategories.has(it.cat)) return false;
      return true;
    });
  }, [items, activeStatuses, activeCategories]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "stockAsc":
        arr.sort((a, b) => a.current / a.min - b.current / b.min);
        break;
      case "stockDesc":
        arr.sort((a, b) => b.current / b.min - a.current / a.min);
        break;
      case "expSoon":
        arr.sort((a, b) => a.expSort.localeCompare(b.expSort));
        break;
      case "category":
        arr.sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
        break;
      case "name":
      default:
        arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return arr;
  }, [filtered, sortKey]);

  const criticalCount = sorted.filter((i) => i.critical).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[22px] font-black tracking-tight" style={{ color: "var(--vet-text-1)" }}>
              Inventario
            </h2>
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full"
              style={{ background: "var(--vet-amber-glow)", color: "var(--vet-amber)" }}
            >
              Próximamente
            </span>
          </div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
            Vista demo · {sorted.length} ítems · {criticalCount} alertas
          </div>
        </div>
      </div>

      <div
        className="px-4 py-3 rounded-[14px] border text-[13px] font-semibold leading-relaxed"
        style={{
          background: "var(--vet-amber-glow)",
          borderColor: "color-mix(in oklab, var(--vet-amber) 40%, transparent)",
          color: "var(--vet-text-2)",
        }}
      >
        Esta sección aún no está conectada a la base de datos. Los valores que ves son ejemplos para mostrar el diseño. Si la veterinaria llega a necesitar control de stock, lo conectamos.
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
            Ningún ítem coincide
          </div>
          <div className="text-[12px] font-semibold mt-1">Ajusta los filtros.</div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div
            className="hidden md:block overflow-hidden border"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              borderRadius: 22,
            }}
          >
            <div
              className="grid items-center px-5 py-2.5 border-b"
              style={{
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 90px",
                background: "var(--vet-bg-mid)",
                borderBottomColor: "var(--vet-border)",
              }}
            >
              {["Producto", "Categoría", "Stock", "Mínimo", "Vence", "Estado"].map((h) => (
                <div
                  key={h}
                  className="text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {h}
                </div>
              ))}
            </div>
            {sorted.map((item, i) => {
              const pct = Math.min((item.current / item.min) * 100, 100);
              return (
                <div
                  key={item.name}
                  className="grid items-center px-5 py-3"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 90px",
                    borderBottom: i < sorted.length - 1 ? "1px solid var(--vet-border)" : "none",
                  }}
                >
                  <div className="font-bold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
                    {item.name}
                  </div>
                  <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-2)" }}>
                    {item.cat}
                  </div>
                  <div
                    className="vet-mono text-[14px] font-bold"
                    style={{ color: item.critical ? "var(--vet-red)" : "var(--vet-text-1)" }}
                  >
                    {item.current}{" "}
                    <span className="text-[11px]" style={{ color: "var(--vet-text-3)" }}>
                      {item.unit}
                    </span>
                  </div>
                  <div>
                    <div
                      className="h-[5px] rounded-full w-16"
                      style={{ background: "var(--vet-bg-hover)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct < 50
                              ? "var(--vet-red)"
                              : pct < 80
                                ? "var(--vet-amber)"
                                : "var(--vet-green)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                    {item.exp}
                  </div>
                  <div>
                    {item.critical ? (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border"
                        style={{
                          background: "oklch(60% 0.20 20 / 0.15)",
                          color: "var(--vet-red)",
                          borderColor: "oklch(60% 0.20 20 / 0.30)",
                        }}
                      >
                        ⚠ Bajo
                      </span>
                    ) : (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border"
                        style={{
                          background: "var(--vet-green-glow)",
                          color: "var(--vet-green)",
                          borderColor: "color-mix(in oklab, var(--vet-green) 30%, transparent)",
                        }}
                      >
                        OK
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-2.5">
            {sorted.map((item) => {
              const pct = Math.min((item.current / item.min) * 100, 100);
              return (
                <div
                  key={item.name}
                  className="p-4 border"
                  style={{
                    background: "var(--vet-bg-card)",
                    borderColor: "var(--vet-border)",
                    borderRadius: 14,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-bold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
                        {item.name}
                      </div>
                      <div
                        className="text-[12px] font-semibold"
                        style={{ color: "var(--vet-text-3)" }}
                      >
                        {item.cat} · vence {item.exp}
                      </div>
                    </div>
                    {item.critical ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap"
                        style={{ background: "oklch(60% 0.20 20 / 0.15)", color: "var(--vet-red)" }}
                      >
                        ⚠ Bajo
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap"
                        style={{ background: "var(--vet-green-glow)", color: "var(--vet-green)" }}
                      >
                        OK
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="vet-mono text-[14px] font-bold"
                      style={{ color: item.critical ? "var(--vet-red)" : "var(--vet-text-1)" }}
                    >
                      {item.current}/{item.min} {item.unit}
                    </span>
                    <div
                      className="h-[5px] flex-1 rounded-full"
                      style={{ background: "var(--vet-bg-hover)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct < 50
                              ? "var(--vet-red)"
                              : pct < 80
                                ? "var(--vet-amber)"
                                : "var(--vet-green)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
