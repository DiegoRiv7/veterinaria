"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import {
  vetSearchAction,
  vetSearchSuggestionsAction,
  type SearchGroup,
  type SearchItem,
} from "@/app/actions/search";

/**
 * Buscador global del panel (se abre desde la lupa del sidebar o ⌘K).
 * Sin búsqueda escrita muestra "Sugerencias": una lista inteligente con
 * las citas que están por suceder, las recién atendidas y lo que el
 * usuario abrió desde el buscador hace poco (historial local).
 */

const RECENTS_KEY = "vf-search-recents";
const RECENTS_MAX = 5;

type RecentItem = SearchItem & { ts: number };

function readRecents(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENTS_MAX) : [];
  } catch {
    return [];
  }
}

function pushRecent(item: SearchItem) {
  try {
    const next: RecentItem[] = [
      { ...item, badge: null, suggestion: false, ts: Date.now() },
      ...readRecents().filter((r) => r.href !== item.href),
    ].slice(0, RECENTS_MAX);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* almacenamiento no disponible — sin recientes */
  }
}

export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);

  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [suggestions, setSuggestions] = useState<SearchItem[]>([]);
  const [recents, setRecents] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);

  const trimmed = query.trim();
  const searching = trimmed.length >= 2;

  // Lista visible: resultados agrupados, o sugerencias + recientes
  const zeroGroups = useMemo<SearchGroup[]>(() => {
    const sugHrefs = new Set(suggestions.map((s) => s.href));
    const recentItems = recents.filter((r) => !sugHrefs.has(r.href));
    const out: SearchGroup[] = [];
    if (suggestions.length > 0) {
      out.push({ key: "sug", label: "Sugerencias", items: suggestions });
    }
    if (recentItems.length > 0) {
      out.push({ key: "rec", label: "Recientes", items: recentItems });
    }
    return out;
  }, [suggestions, recents]);

  const shownGroups = searching ? groups : zeroGroups;
  const flat = useMemo(() => shownGroups.flatMap((g) => g.items), [shownGroups]);

  // Al abrir: enfocar, cargar recientes y refrescar sugerencias
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const seq = ++seqRef.current;
    const load = setTimeout(async () => {
      if (seqRef.current !== seq) return;
      setRecents(readRecents());
      try {
        const items = await vetSearchSuggestionsAction();
        if (seqRef.current === seq) {
          setSuggestions(items);
          setSelected(0);
        }
      } catch {
        /* sin sugerencias */
      }
    }, 0);
    return () => {
      clearTimeout(t);
      clearTimeout(load);
    };
  }, [open]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!open) return;
    const seq = ++seqRef.current;
    const t = setTimeout(
      async () => {
        if (seqRef.current !== seq) return;
        if (trimmed.length < 2) {
          setGroups([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const res = await vetSearchAction(trimmed);
          if (seqRef.current === seq) {
            setGroups(res.groups);
            setSelected(0);
            setLoading(false);
          }
        } catch {
          if (seqRef.current === seq) setLoading(false);
        }
      },
      trimmed.length < 2 ? 0 : 220
    );
    return () => clearTimeout(t);
  }, [trimmed, open]);

  function close() {
    setQuery("");
    setGroups([]);
    setSelected(0);
    onClose();
  }

  function openItem(item: SearchItem) {
    pushRecent(item);
    router.push(item.href);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flat[selected]) {
      e.preventDefault();
      openItem(flat[selected]);
    }
  }

  if (!open || typeof document === "undefined") return null;

  let flatIndex = -1;

  return createPortal(
    <div
      className="vet-portal fixed inset-0 z-[150] flex justify-center px-3 pt-[10vh] sm:pt-[13vh]"
      style={{
        background: "rgba(30, 18, 10, 0.42)",
        backdropFilter: "blur(4px)",
        minHeight: 0,
      }}
      onClick={close}
    >
      <div
        className="w-full max-w-[600px] h-fit rounded-[20px] border overflow-hidden"
        style={{
          background: "var(--vet-bg-mid)",
          borderColor: "var(--vet-border)",
          boxShadow: "0 40px 90px rgba(0,0,0,0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de búsqueda */}
        <div
          className="flex items-center gap-3 px-5 h-[54px]"
          style={{
            borderBottom: flat.length > 0 ? "1px solid var(--vet-border)" : "none",
          }}
        >
          {loading ? (
            <Loader2
              className="h-[18px] w-[18px] animate-spin shrink-0"
              style={{ color: "var(--vet-green)" }}
            />
          ) : (
            <Search
              className="h-[18px] w-[18px] shrink-0"
              style={{ color: "var(--vet-green)" }}
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar…"
            className="flex-1 bg-transparent border-none outline-none text-[15px] font-semibold"
            style={{ color: "var(--vet-text-1)" }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Resultados / sugerencias */}
        {flat.length > 0 || (searching && !loading) ? (
          <div className="max-h-[56vh] overflow-y-auto">
            {searching && !loading && groups.length === 0 ? (
              <p
                className="px-5 py-4 text-[12.5px] font-semibold"
                style={{ color: "var(--vet-text-3)" }}
              >
                Sin resultados para “{trimmed}”.
              </p>
            ) : (
              <div className="py-1.5">
                {shownGroups.map((g) => (
                  <div key={g.key} className="px-2 pb-1">
                    <p
                      className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.12em]"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      {g.label}
                    </p>
                    {g.items.map((item) => {
                      flatIndex++;
                      const idx = flatIndex;
                      const active = idx === selected;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openItem(item)}
                          onMouseEnter={() => setSelected(idx)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-left transition-colors"
                          style={{
                            background: active
                              ? "color-mix(in oklab, var(--vet-green) 12%, transparent)"
                              : "transparent",
                          }}
                        >
                          <span
                            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[17px] shrink-0 border"
                            style={{
                              background: "var(--vet-bg-card)",
                              borderColor: active
                                ? "color-mix(in oklab, var(--vet-green) 32%, var(--vet-border))"
                                : "var(--vet-border)",
                            }}
                          >
                            {item.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span
                                className="text-[14px] font-extrabold truncate"
                                style={{
                                  color: active
                                    ? "var(--vet-green-dim)"
                                    : "var(--vet-text-1)",
                                }}
                              >
                                {item.title}
                              </span>
                              {item.suggestion && (
                                <span
                                  className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
                                  style={{
                                    background: "var(--vet-amber-glow)",
                                    color: "var(--vet-amber)",
                                  }}
                                >
                                  ¿Buscabas esto?
                                </span>
                              )}
                            </span>
                            <span
                              className="block text-[12px] font-semibold truncate"
                              style={{ color: "var(--vet-text-3)" }}
                            >
                              {item.subtitle}
                            </span>
                          </span>
                          {item.badge && (
                            <span
                              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0"
                              style={{
                                background:
                                  "color-mix(in oklab, var(--vet-green) 12%, transparent)",
                                color: "var(--vet-green-dim)",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
