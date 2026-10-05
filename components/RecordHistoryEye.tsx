"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Loader2, RotateCcw, X } from "lucide-react";
import { revertHealthRecordChangeAction } from "@/app/actions/record-edits";

/**
 * Ojo de historial individual de un registro del expediente: lista quién
 * cambió qué y cuándo, con opción de revertir cada cambio. Solo se
 * muestra si el registro tiene cambios.
 */

export type RecordChange = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedByName: string;
  createdAt: string; // ISO
  reverted: boolean;
};

function defaultDisplay(value: string | null): string {
  if (value === null || value === "") return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
    }
  }
  return value;
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));
}

export function RecordHistoryEye({
  changes,
  title,
  fieldLabels,
  dark = false,
}: {
  changes: RecordChange[];
  title: string;
  /** Etiqueta humana por campo ("appliedAt" → "Aplicada"…). */
  fieldLabels: Record<string, string>;
  dark?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);

  if (changes.length === 0) return null;

  const t = dark
    ? {
        bg: "oklch(24% 0.05 35)",
        bgMid: "oklch(20% 0.04 35)",
        hover: "oklch(28% 0.05 35)",
        border: "oklch(34% 0.05 35)",
        text: "oklch(96% 0.02 60)",
        text2: "oklch(78% 0.04 60)",
        text3: "oklch(58% 0.04 60)",
        green: "oklch(76% 0.18 145)",
      }
    : {
        bg: "var(--vet-bg-card, var(--color-surface))",
        bgMid: "var(--vet-bg-mid, var(--color-surface-2, var(--color-surface)))",
        hover: "var(--vet-bg-hover, var(--color-surface-2, var(--color-surface)))",
        border: "var(--vet-border, var(--color-border))",
        text: "var(--vet-text-1, var(--color-foreground))",
        text2: "var(--vet-text-2, var(--color-foreground))",
        text3: "var(--vet-text-3, var(--color-muted))",
        green: "var(--vet-green, var(--color-brand))",
      };

  async function revertChange(c: RecordChange) {
    if (reverting) return;
    setReverting(c.id);
    const res = await revertHealthRecordChangeAction(c.id);
    setReverting(null);
    if (res.ok) {
      toast.success(`${fieldLabels[c.field] ?? c.field} revertido.`);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Historial de cambios de ${title}`}
        title="Historial de cambios"
        className="w-7 h-7 rounded-full flex items-center justify-center transition hover:brightness-95 shrink-0"
        style={{ background: t.hover, color: t.text3 }}
      >
        <Eye className="h-3.5 w-3.5" />
      </button>

      {open && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-6"
            style={{ background: "rgba(15, 10, 6, 0.55)", backdropFilter: "blur(3px)" }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <div
              className="w-full max-w-[540px] max-h-[85dvh] overflow-y-auto rounded-[20px] border"
              style={{
                background: t.bgMid,
                borderColor: t.border,
                boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between gap-3 px-5 py-4 border-b sticky top-0 z-10"
                style={{ background: t.bgMid, borderBottomColor: t.border }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="h-4 w-4 shrink-0" style={{ color: t.green }} />
                  <h3 className="text-[14px] font-black truncate" style={{ color: t.text }}>
                    Historial · {title}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-[9px] border flex items-center justify-center transition hover:brightness-95 shrink-0"
                  style={{ background: t.bg, borderColor: t.border, color: t.text3 }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 p-4">
                {changes.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-[14px] border px-4 py-3"
                    style={{
                      background: t.bg,
                      borderColor: t.border,
                      opacity: c.reverted ? 0.65 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-extrabold" style={{ color: t.text }}>
                        {fieldLabels[c.field] ?? c.field}
                      </span>
                      {c.reverted ? (
                        <span
                          className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{ background: t.hover, color: t.text3 }}
                        >
                          Revertido
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => revertChange(c)}
                          disabled={!!reverting}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-[11px] font-extrabold transition hover:brightness-95 disabled:opacity-60"
                          style={{ background: t.bgMid, borderColor: t.border, color: t.text2 }}
                        >
                          {reverting === c.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          Revertir
                        </button>
                      )}
                    </div>
                    <div className="text-[13px] font-bold mt-1.5" style={{ color: t.text2 }}>
                      <span style={{ color: t.text3, textDecoration: "line-through" }}>
                        {defaultDisplay(c.oldValue)}
                      </span>
                      <span className="mx-1.5" style={{ color: t.text3 }}>→</span>
                      <span style={{ color: t.green }}>{defaultDisplay(c.newValue)}</span>
                    </div>
                    <div className="text-[11.5px] font-semibold mt-1" style={{ color: t.text3 }}>
                      {c.changedByName} · {formatWhen(c.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
