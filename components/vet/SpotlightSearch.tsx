"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import {
  vetSearchAction,
  type SearchGroup,
  type SearchItem,
} from "@/app/actions/search";

/**
 * Spotlight del panel veterinario: búsqueda global sobre pacientes,
 * clientes, citas, chats, expediente, servicios y secciones. Tolerante a
 * errores de dedo, acentos, mayúsculas, teléfonos y correos (el motor
 * vive en el servidor — ver app/actions/search.ts).
 */

export function SpotlightSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const seqRef = useRef(0);

  // Lista plana para navegación con teclado
  const flat = useMemo(() => {
    const out: SearchItem[] = [];
    for (const g of groups) out.push(...g.items);
    return out;
  }, [groups]);

  const close = useCallback(() => {
    setQuery("");
    setGroups([]);
    setSelected(0);
    onClose();
  }, [onClose]);

  // Enfocar al abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Búsqueda con debounce; ignora respuestas viejas
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
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, flat.length - 1));
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
      className="vet-portal fixed inset-0 z-[150] flex justify-center px-3 pt-[10vh] sm:pt-[14vh]"
      style={{ background: "rgba(30, 18, 10, 0.42)", backdropFilter: "blur(4px)", minHeight: 0 }}
      onClick={close}
    >
      <div
        className="w-full max-w-[640px] h-fit rounded-[20px] border overflow-hidden"
        style={{
          background: "var(--vet-bg-mid)",
          borderColor: "var(--vet-border)",
          boxShadow: "0 40px 90px rgba(0,0,0,0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de búsqueda */}
        <div
          className="flex items-center gap-3 px-5 h-[58px] border-b"
          style={{ borderBottomColor: "var(--vet-border)" }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin shrink-0" style={{ color: "var(--vet-green)" }} />
          ) : (
            <Search className="h-5 w-5 shrink-0" style={{ color: "var(--vet-green)" }} />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar pacientes, clientes, citas, chats, estudios…"
            className="flex-1 bg-transparent border-none outline-none text-[16px] font-semibold"
            style={{ color: "var(--vet-text-1)" }}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd
            className="hidden sm:inline-flex items-center px-2 py-1 rounded-[7px] border text-[10px] font-extrabold"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-3)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-[56vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <div className="py-10 text-center">
              <p className="text-[28px] mb-1.5">🔍</p>
              <p className="text-[13px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                Busca lo que sea de la clínica
              </p>
              <p className="text-[12px] font-semibold mt-1 px-8" style={{ color: "var(--vet-text-3)" }}>
                Nombres, teléfonos, correos, vacunas, estudios, mensajes… aunque
                lo escribas con errores o sin acentos.
              </p>
            </div>
          ) : !loading && groups.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[28px] mb-1.5">🤷</p>
              <p className="text-[13px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                Sin resultados para “{query.trim()}”
              </p>
              <p className="text-[12px] font-semibold mt-1" style={{ color: "var(--vet-text-3)" }}>
                Prueba con menos letras o con otro dato (teléfono, correo…).
              </p>
            </div>
          ) : (
            <div className="py-2">
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
                              style={{ color: active ? "var(--vet-green-dim)" : "var(--vet-text-1)" }}
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
                              background: "color-mix(in oklab, var(--vet-green) 12%, transparent)",
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

        {/* Pie con atajos */}
        <div
          className="flex items-center gap-4 px-5 py-2.5 border-t text-[11px] font-bold"
          style={{ borderTopColor: "var(--vet-border)", color: "var(--vet-text-3)" }}
        >
          <span>↑↓ navegar</span>
          <span>Enter abrir</span>
          <span>Esc cerrar</span>
          <span className="ml-auto hidden sm:inline">⌘K para abrir desde donde sea</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
