"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import {
  vetSearchAction,
  type SearchGroup,
  type SearchItem,
} from "@/app/actions/search";

/**
 * Búsqueda global del panel, integrada al topbar: la barra vive donde
 * antes estaba el título y los resultados se despliegan ahí mismo,
 * debajo de la barra (dropdown anclado, no un widget centrado).
 *
 * - variant "bar": input siempre visible (desktop).
 * - variant "icon": lupa compacta que abre la misma experiencia (móvil).
 * El atajo ⌘K / Ctrl+K enfoca la barra.
 */

type PanelPos = { left: number; top: number; width: number };

export function TopbarSearch({ variant = "bar" }: { variant?: "bar" | "icon" }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const [pos, setPos] = useState<PanelPos | null>(null);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  function computePos(): PanelPos | null {
    const anchor = rootRef.current;
    if (!anchor) return null;
    const r = anchor.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 520), window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    return { left, top: r.bottom + 8, width };
  }

  function openPanel() {
    setPos(computePos());
    setOpen(true);
  }

  function closePanel(clear = false) {
    setOpen(false);
    if (clear) {
      setQuery("");
      setGroups([]);
      setSelected(0);
    }
  }

  // ⌘K / Ctrl+K enfoca la búsqueda (solo la variante de barra)
  useEffect(() => {
    if (variant !== "bar") return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [variant]);

  // Cerrar con clic fuera / reposicionar en resize
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      closePanel();
    }
    function onResize() {
      setPos(computePos());
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Búsqueda con debounce; descarta respuestas viejas
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
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
  }, [query, open]);

  function openItem(item: SearchItem) {
    router.push(item.href);
    closePanel(true);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePanel(true);
      inputRef.current?.blur();
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

  let flatIndex = -1;
  const trimmed = query.trim();

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            className="vet-portal rounded-[18px] border overflow-hidden flex flex-col"
            style={{
              position: "fixed",
              left: pos?.left ?? 8,
              top: pos?.top ?? 68,
              width: pos?.width ?? 520,
              zIndex: 120,
              minHeight: 0,
              maxHeight: "min(62vh, calc(100dvh - 90px))",
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              boxShadow: "0 28px 70px rgba(0,0,0,0.28)",
            }}
          >
            <div className="flex-1 overflow-y-auto">
              {trimmed.length < 2 ? (
                <div className="py-8 text-center">
                  <p className="text-[24px] mb-1">🔍</p>
                  <p className="text-[12.5px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                    Busca lo que sea de la clínica
                  </p>
                  <p
                    className="text-[11.5px] font-semibold mt-1 px-8"
                    style={{ color: "var(--vet-text-3)" }}
                  >
                    Nombres, teléfonos, correos, vacunas, estudios, mensajes…
                    aunque lo escribas con errores o sin acentos.
                  </p>
                </div>
              ) : !loading && groups.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[24px] mb-1">🤷</p>
                  <p className="text-[12.5px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                    Sin resultados para “{trimmed}”
                  </p>
                  <p
                    className="text-[11.5px] font-semibold mt-1"
                    style={{ color: "var(--vet-text-3)" }}
                  >
                    Prueba con menos letras o con otro dato (teléfono, correo…).
                  </p>
                </div>
              ) : (
                <div className="py-1.5">
                  {groups.map((g) => (
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
            <div
              className="flex items-center gap-4 px-4 py-2 border-t text-[10.5px] font-bold shrink-0"
              style={{ borderTopColor: "var(--vet-border)", color: "var(--vet-text-3)" }}
            >
              <span>↑↓ navegar</span>
              <span>Enter abrir</span>
              <span>Esc cerrar</span>
            </div>
          </div>,
          document.body
        )
      : null;

  if (variant === "icon") {
    return (
      <div ref={rootRef} className="relative">
        {open ? (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 px-3 h-10 rounded-[12px] border"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "color-mix(in oklab, var(--vet-green) 40%, var(--vet-border))",
              }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: "var(--vet-green)" }} />
              ) : (
                <Search className="h-4 w-4 shrink-0" style={{ color: "var(--vet-green)" }} />
              )}
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar…"
                className="w-[46vw] max-w-[260px] bg-transparent border-none outline-none text-[14px] font-semibold"
                style={{ color: "var(--vet-text-1)" }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                aria-label="Cerrar búsqueda"
                onClick={() => closePanel(true)}
                style={{ color: "var(--vet-text-3)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Buscar"
            onClick={openPanel}
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
            style={{ color: "var(--vet-text-2)" }}
          >
            <Search className="h-[20px] w-[20px]" />
          </button>
        )}
        {panel}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <div
        className="flex items-center gap-2.5 px-3.5 h-10 rounded-[12px] border transition-colors"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: open
            ? "color-mix(in oklab, var(--vet-green) 40%, var(--vet-border))"
            : "var(--vet-border)",
          boxShadow: open
            ? "0 0 0 3px color-mix(in oklab, var(--vet-green) 14%, transparent)"
            : undefined,
        }}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: "var(--vet-green)" }} />
        ) : (
          <Search className="h-4 w-4 shrink-0" style={{ color: "var(--vet-text-3)" }} />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={openPanel}
          onKeyDown={onKeyDown}
          placeholder="Buscar pacientes, clientes, citas, estudios…"
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-[14px] font-semibold"
          style={{ color: "var(--vet-text-1)" }}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            aria-label="Limpiar"
            onClick={() => {
              setQuery("");
              setGroups([]);
              inputRef.current?.focus();
            }}
            style={{ color: "var(--vet-text-3)" }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {panel}
    </div>
  );
}
