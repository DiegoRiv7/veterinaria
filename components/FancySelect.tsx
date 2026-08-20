"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

/**
 * Select con el diseño del sistema — mismo estilo que los dropdowns de los
 * formularios de consulta — en lugar del selector nativo del navegador.
 *
 * - Si se pasa `name`, mantiene un input oculto para que el valor viaje con
 *   el FormData del formulario y la validación `required` siga funcionando.
 * - El menú se renderiza en un portal con posición fija: nunca lo recorta
 *   un contenedor con overflow-hidden (pasaporte, diálogos…) y se voltea
 *   hacia arriba cuando no hay espacio abajo.
 * - Tamaño y paleta configurables (`height`, `fontSize`, `radius`,
 *   `borderWidth`, `tokens`) para encajar en cada contexto visual.
 */

export type FancyOption = { value: string; label: string };

export type FancyTokens = {
  inputBg: string;
  menuBg: string;
  hoverBg: string;
  border: string;
  text: string;
  textMuted: string;
  menuShadow: string;
  /** Sombra del botón en reposo (opcional). */
  buttonShadow?: string;
};

/** Paleta para las vistas con tema del panel veterinario (var(--vet-*)). */
export const VET_TOKENS: Partial<FancyTokens> = {
  inputBg: "var(--vet-bg-card)",
  menuBg: "var(--vet-bg-card)",
  hoverBg: "var(--vet-bg-hover)",
  border: "var(--vet-border)",
  text: "var(--vet-text-1)",
  textMuted: "var(--vet-text-3)",
};

type MenuPos = {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxH: number;
};

export function FancySelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Selecciona…",
  required = false,
  disabled = false,
  dark = false,
  accent = "var(--color-brand)",
  height = 48,
  fontSize = 14,
  radius = 12,
  borderWidth = 1,
  tokens,
  className,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  options: FancyOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** true → tokens base del tema oscuro (cartilla del cliente). */
  dark?: boolean;
  accent?: string;
  height?: number;
  fontSize?: number;
  radius?: number;
  borderWidth?: number;
  /** Sobrescribe colores puntuales del tema base. */
  tokens?: Partial<FancyTokens>;
  /** Clases extra para el contenedor (p. ej. ancho fijo). */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const base: FancyTokens = dark
    ? {
        inputBg: "oklch(20% 0.04 35)",
        menuBg: "oklch(24% 0.05 35)",
        hoverBg: "oklch(30% 0.05 35)",
        border: "oklch(34% 0.05 35)",
        text: "oklch(96% 0.02 60)",
        textMuted: "oklch(58% 0.04 60)",
        menuShadow: "0 18px 45px rgba(0,0,0,.45)",
      }
    : {
        inputBg: "var(--color-surface-2, var(--color-surface))",
        menuBg: "var(--color-surface)",
        hoverBg: `color-mix(in oklab, ${accent} 7%, transparent)`,
        border: "var(--color-border)",
        text: "var(--color-foreground)",
        textMuted: "var(--color-muted)",
        menuShadow: "0 18px 45px rgba(0,0,0,.16)",
      };
  const t: FancyTokens = { ...base, ...tokens };

  const compact = height < 44;

  function computePos(): MenuPos | null {
    const btn = btnRef.current;
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const openUp = below < 200 && above > below;
    const maxH = Math.max(120, Math.min(280, (openUp ? above : below) - 10));
    return openUp
      ? {
          left: r.left,
          bottom: window.innerHeight - r.top + 6,
          width: r.width,
          maxH,
        }
      : { left: r.left, top: r.bottom + 6, width: r.width, maxH };
  }

  function openMenu() {
    if (disabled) return;
    setPos(computePos());
    setHovered(null);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll(e: Event) {
      // Desplazamiento dentro del propio menú: no cerrar.
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onResize() {
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? (value || "");

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  const chevronBox = compact ? 22 : 28;

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      {name && (
        <input
          type="text"
          name={name}
          value={value}
          required={required}
          onChange={() => {}}
          onFocus={openMenu}
          tabIndex={-1}
          aria-hidden
          className="absolute bottom-0 left-1/2 h-px w-px opacity-0 pointer-events-none"
        />
      )}

      <button
        ref={btnRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="w-full border text-left font-bold outline-none transition disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          height,
          minHeight: height,
          boxSizing: "border-box",
          fontSize,
          borderRadius: radius,
          borderWidth,
          paddingLeft: compact ? 10 : 16,
          paddingRight: chevronBox + (compact ? 14 : 20),
          background: t.inputBg,
          borderColor: open
            ? `color-mix(in oklab, ${accent} 46%, ${t.border})`
            : t.border,
          color: selectedLabel ? t.text : t.textMuted,
          boxShadow: open
            ? `0 0 0 3px color-mix(in oklab, ${accent} 18%, transparent)`
            : t.buttonShadow,
        }}
      >
        <span className="block truncate">{selectedLabel || placeholder}</span>
        <span
          className="absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center pointer-events-none"
          style={{
            right: compact ? 6 : 12,
            width: chevronBox,
            height: chevronBox,
            borderRadius: compact ? 7 : 9,
            background: `color-mix(in oklab, ${accent} 12%, transparent)`,
            color: accent,
          }}
        >
          <ChevronDown
            className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} transition-transform ${
              open ? "rotate-180" : ""
            }`}
            strokeWidth={2.5}
          />
        </span>
      </button>

      {open && !disabled && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-labelledby={id}
            className="overflow-hidden border p-1.5"
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              width: pos.width,
              zIndex: 90,
              borderRadius: radius + 2,
              background: t.menuBg,
              borderColor: `color-mix(in oklab, ${accent} 26%, ${t.border})`,
              boxShadow: t.menuShadow,
            }}
          >
            <div
              className="overflow-y-auto pr-0.5"
              style={{ maxHeight: pos.maxH }}
            >
              {!required && (
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  onClick={() => pick("")}
                  onMouseEnter={() => setHovered("")}
                  onMouseLeave={() => setHovered(null)}
                  className="flex w-full items-center rounded-[10px] text-left font-bold transition"
                  style={{
                    fontSize,
                    padding: compact ? "7px 10px" : "10px 12px",
                    background: hovered === "" ? t.hoverBg : "transparent",
                    color: t.textMuted,
                  }}
                >
                  {placeholder}
                </button>
              )}
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(o.value)}
                    onMouseEnter={() => setHovered(o.value)}
                    onMouseLeave={() => setHovered(null)}
                    className="mt-0.5 first:mt-0 flex w-full items-center justify-between gap-3 rounded-[10px] text-left font-extrabold transition"
                    style={{
                      fontSize,
                      padding: compact ? "7px 10px" : "10px 12px",
                      background: active
                        ? `color-mix(in oklab, ${accent} 14%, transparent)`
                        : hovered === o.value
                        ? t.hoverBg
                        : "transparent",
                      color: active ? accent : t.text,
                    }}
                  >
                    <span className="truncate">{o.label}</span>
                    {active && (
                      <Check
                        className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
