"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Select con el diseño del sistema — mismo estilo que los dropdowns de los
 * formularios de consulta — en lugar del selector nativo del navegador.
 *
 * Si se pasa `name`, mantiene un input oculto para que el valor viaje con
 * el FormData del formulario y la validación `required` del navegador siga
 * funcionando.
 */

export type FancyOption = { value: string; label: string };

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
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  options: FancyOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** true → tokens del tema oscuro (cartilla del cliente). */
  dark?: boolean;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const t = dark
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

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? (value || "");

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      {name && (
        <input
          type="text"
          name={name}
          value={value}
          required={required}
          onChange={() => {}}
          onFocus={() => !disabled && setOpen(true)}
          tabIndex={-1}
          aria-hidden
          className="absolute bottom-0 left-1/2 h-px w-px opacity-0 pointer-events-none"
        />
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        className="w-full rounded-[12px] border px-4 pr-11 text-left text-[14px] font-bold outline-none transition disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          height: 48,
          background: t.inputBg,
          borderColor: open
            ? `color-mix(in oklab, ${accent} 46%, ${t.border})`
            : t.border,
          color: selectedLabel ? t.text : t.textMuted,
          boxShadow: open
            ? `0 0 0 3px color-mix(in oklab, ${accent} 18%, transparent)`
            : undefined,
        }}
      >
        <span className="block truncate">{selectedLabel || placeholder}</span>
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-[9px] pointer-events-none"
          style={{
            background: `color-mix(in oklab, ${accent} 12%, transparent)`,
            color: accent,
          }}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={2.5}
          />
        </span>
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          aria-labelledby={id}
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-[14px] border p-1.5"
          style={{
            background: t.menuBg,
            borderColor: `color-mix(in oklab, ${accent} 26%, ${t.border})`,
            boxShadow: t.menuShadow,
          }}
        >
          <div className="max-h-[260px] overflow-y-auto pr-0.5">
            {!required && (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => pick("")}
                onMouseEnter={() => setHovered("")}
                onMouseLeave={() => setHovered(null)}
                className="flex w-full items-center rounded-[10px] px-3 py-2.5 text-left text-[14px] font-bold transition"
                style={{
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
                  className="mt-0.5 first:mt-0 flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] font-extrabold transition"
                  style={{
                    background: active
                      ? `color-mix(in oklab, ${accent} 14%, transparent)`
                      : hovered === o.value
                      ? t.hoverBg
                      : "transparent",
                    color: active ? accent : t.text,
                  }}
                >
                  <span className="truncate">{o.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
