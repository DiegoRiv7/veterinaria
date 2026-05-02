"use client";

import { useEffect, useRef, useState } from "react";
import { VetIcon } from "./VetIcon";

export type FilterOption = {
  value: string;
  label: string;
  color?: string;
};

export type FilterType = {
  key: string;
  label: string;
  options: FilterOption[];
};

export type SortOption = {
  key: string;
  label: string;
};

export type FilterChip = { type: string; value: string };

type Props = {
  filterTypes: FilterType[];
  filters: FilterChip[];
  onAddFilter: (chip: FilterChip) => void;
  onRemoveFilter: (chip: FilterChip) => void;
  sortOptions: SortOption[];
  sortKey: string;
  defaultSortKey?: string;
  onSortChange: (k: string) => void;
};

export function FilterSortBar({
  filterTypes,
  filters,
  onAddFilter,
  onRemoveFilter,
  sortOptions,
  sortKey,
  defaultSortKey,
  onSortChange,
}: Props) {
  const [filterMenu, setFilterMenu] = useState<null | "root" | string>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterMenu(null);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    if (filterMenu || sortOpen) {
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }
  }, [filterMenu, sortOpen]);

  function findType(typeKey: string) {
    return filterTypes.find((t) => t.key === typeKey);
  }
  function findOption(typeKey: string, value: string) {
    return findType(typeKey)?.options.find((o) => o.value === value);
  }
  function chipLabel(chip: FilterChip) {
    return findOption(chip.type, chip.value)?.label ?? chip.value;
  }
  function chipColor(chip: FilterChip) {
    return findOption(chip.type, chip.value)?.color ?? "var(--vet-text-3)";
  }
  function chipTypeLabel(typeKey: string) {
    return findType(typeKey)?.label ?? typeKey;
  }

  const isCustomSort = sortKey !== (defaultSortKey ?? sortOptions[0]?.key);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* + Filtro */}
      <div ref={filterRef} className="relative">
        <button
          type="button"
          onClick={() => setFilterMenu((m) => (m === null ? "root" : null))}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12px] font-extrabold transition-colors"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: filterMenu ? "var(--vet-green)" : "var(--vet-border)",
            color: filterMenu ? "var(--vet-green)" : "var(--vet-text-2)",
            borderStyle: "dashed",
          }}
        >
          <VetIcon
            name="plus"
            size={12}
            color={filterMenu ? "var(--vet-green)" : "var(--vet-text-2)"}
          />
          Filtro
        </button>
        {filterMenu && (
          <div
            className="absolute left-0 top-11 z-50 min-w-[220px] border rounded-[14px] p-1.5 flex flex-col"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              boxShadow: "0 16px 40px oklch(20% 0.04 240 / 0.30)",
            }}
          >
            {filterMenu === "root" ? (
              <>
                <div
                  className="text-[10px] font-extrabold uppercase tracking-wider px-3 pt-2 pb-1"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  Filtrar por
                </div>
                {filterTypes.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFilterMenu(t.key)}
                    className="text-left px-3 py-2 rounded-[10px] text-[13px] font-bold flex items-center justify-between hover:[background:var(--vet-bg-hover)]"
                    style={{ color: "var(--vet-text-1)" }}
                  >
                    {t.label}
                    <VetIcon name="chevronRight" size={12} color="var(--vet-text-3)" />
                  </button>
                ))}
              </>
            ) : (
              (() => {
                const t = findType(filterMenu);
                if (!t) return null;
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setFilterMenu("root")}
                      className="text-left px-3 py-2 rounded-[10px] text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      <VetIcon name="chevronLeft" size={12} color="var(--vet-text-3)" />{" "}
                      {t.label}
                    </button>
                    {t.options.map((opt) => {
                      const already = filters.some(
                        (f) => f.type === t.key && f.value === opt.value
                      );
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={already}
                          onClick={() => {
                            onAddFilter({ type: t.key, value: opt.value });
                            setFilterMenu(null);
                          }}
                          className="text-left px-3 py-2 rounded-[10px] text-[13px] font-bold flex items-center gap-2 hover:[background:var(--vet-bg-hover)] disabled:opacity-40"
                          style={{ color: "var(--vet-text-1)" }}
                        >
                          {opt.color && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: opt.color }}
                            />
                          )}
                          {opt.label}
                          {already && (
                            <span
                              className="ml-auto text-[10px] font-bold"
                              style={{ color: "var(--vet-text-3)" }}
                            >
                              activo
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* Active chips */}
      {filters.map((f) => {
        const color = chipColor(f);
        return (
          <span
            key={`${f.type}-${f.value}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-[12px] font-extrabold"
            style={{
              background: `color-mix(in oklab, ${color} 12%, transparent)`,
              borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
              color,
            }}
          >
            <span style={{ color: "var(--vet-text-3)" }}>{chipTypeLabel(f.type)}</span>
            <span style={{ color: "var(--vet-text-3)", opacity: 0.6 }}>=</span>
            <span>{chipLabel(f)}</span>
            <button
              type="button"
              aria-label="Quitar filtro"
              onClick={() => onRemoveFilter(f)}
              className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:[background:color-mix(in_oklab,var(--vet-text-1)_15%,transparent)]"
              style={{ color }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path
                  d="M1 1l7 7M8 1L1 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sort */}
      <div ref={sortRef} className="relative">
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full border text-[12px] font-extrabold transition-colors"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: sortOpen ? "var(--vet-green)" : "var(--vet-border)",
            color: isCustomSort ? "var(--vet-green)" : "var(--vet-text-2)",
          }}
        >
          <SortIcon color={isCustomSort ? "var(--vet-green)" : "var(--vet-text-2)"} />
          Ordenar
          {isCustomSort && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--vet-green-glow)", color: "var(--vet-green)" }}
            >
              1
            </span>
          )}
        </button>
        {sortOpen && (
          <div
            className="absolute right-0 top-11 z-50 min-w-[260px] border rounded-[14px] p-1.5 flex flex-col"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              boxShadow: "0 16px 40px oklch(20% 0.04 240 / 0.30)",
            }}
          >
            <div
              className="text-[10px] font-extrabold uppercase tracking-wider px-3 pt-2 pb-1"
              style={{ color: "var(--vet-text-3)" }}
            >
              Ordenar por
            </div>
            {sortOptions.map((opt) => {
              const active = sortKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onSortChange(opt.key);
                    setSortOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-[10px] text-[13px] font-bold flex items-center justify-between hover:[background:var(--vet-bg-hover)]"
                  style={{
                    background: active ? "var(--vet-green-glow)" : "transparent",
                    color: active ? "var(--vet-green)" : "var(--vet-text-1)",
                  }}
                >
                  {opt.label}
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 7l3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SortIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  );
}
