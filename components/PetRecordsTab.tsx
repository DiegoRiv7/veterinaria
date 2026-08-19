"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import type { HealthRecordResult } from "@/app/actions/health-records";

/**
 * Sección genérica de registros de la cartilla (laboratorio, tests,
 * imagenología, alimentación…). El formulario de captura se arma a partir
 * de una lista de campos, y cada registro se muestra como tarjeta con
 * título, fecha, badge opcional, detalles y notas.
 */

export const OTHER_OPTION = "__otro__";

export type RecordField = {
  id: string;
  label: string;
  type: "select" | "date" | "text" | "number" | "textarea";
  options?: string[];
  /** En selects: agrega "Otro…" con captura libre. */
  allowOther?: boolean;
  required?: boolean;
  placeholder?: string;
  /** Sufijo visual para números ("g", "kg"). */
  suffix?: string;
  step?: string;
  /** true → el campo ocupa toda la fila; si no, comparte fila (grid 2). */
  full?: boolean;
  defaultValue?: string;
};

export type RecordBadge = {
  label: string;
  tone: "green" | "red" | "amber" | "neutral";
};

export type RecordEntry = {
  id: string;
  title: string;
  /** ISO — se muestra formateada. */
  date: string;
  badge?: RecordBadge | null;
  details: { label: string; value: string }[];
  notes?: string | null;
  addedByName: string;
};

const BADGE_TONES: Record<RecordBadge["tone"], { bg: string; color: string; border: string }> = {
  green: {
    bg: "color-mix(in oklab, var(--vet-green, #2f7d4f) 12%, transparent)",
    color: "var(--vet-green, #2f7d4f)",
    border: "color-mix(in oklab, var(--vet-green, #2f7d4f) 28%, transparent)",
  },
  red: {
    bg: "color-mix(in oklab, #ef4444 12%, transparent)",
    color: "#c0392b",
    border: "color-mix(in oklab, #ef4444 28%, transparent)",
  },
  amber: {
    bg: "color-mix(in oklab, var(--vet-amber, #d49247) 14%, transparent)",
    color: "var(--vet-amber, #b46e3e)",
    border: "color-mix(in oklab, var(--vet-amber, #d49247) 32%, transparent)",
  },
  neutral: {
    bg: "var(--color-surface-2, var(--color-surface))",
    color: "var(--color-muted)",
    border: "var(--color-border)",
  },
};

function formatLong(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function todayInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const inputClass =
  "w-full px-4 rounded-[12px] border text-[14px] outline-none focus:border-[var(--color-brand)] transition appearance-none";

export function PetRecordsTab({
  petId,
  entries,
  fields,
  emoji,
  addLabel,
  formTitle,
  emptyTitle,
  emptyHint,
  successMessage,
  addAction,
  deleteAction,
  readonly = false,
  dark = false,
  accent = "var(--color-brand)",
}: {
  petId: string;
  entries: RecordEntry[];
  fields: RecordField[];
  emoji: string;
  addLabel: string;
  formTitle: string;
  emptyTitle: string;
  emptyHint: string;
  successMessage: string;
  addAction: (prev: unknown, fd: FormData) => Promise<HealthRecordResult>;
  deleteAction: (id: string) => Promise<void>;
  readonly?: boolean;
  dark?: boolean;
  accent?: string;
}) {
  // Tokens de tema — claro (cartilla del vet) u oscuro (cartilla del cliente),
  // mismos valores que PetVaccinesTab.
  const t = dark
    ? {
        cardBg: "oklch(24% 0.05 35)",
        cardBgLight: "oklch(28% 0.05 35)",
        border: "oklch(34% 0.05 35)",
        text: "oklch(96% 0.02 60)",
        textDim: "oklch(78% 0.04 60)",
        textMuted: "oklch(58% 0.04 60)",
        inputBg: "oklch(20% 0.04 35)",
      }
    : {
        cardBg: "var(--color-surface)",
        cardBgLight: "var(--color-surface-2, var(--color-surface))",
        border: "var(--color-border)",
        text: "var(--color-foreground)",
        textDim: "var(--color-foreground)",
        textMuted: "var(--color-muted)",
        inputBg: "var(--color-surface-2, var(--color-surface))",
      };

  const inputStyle: React.CSSProperties = {
    height: 48,
    minHeight: 48,
    boxSizing: "border-box",
    WebkitAppearance: "none",
    background: t.inputBg,
    borderColor: t.border,
    color: t.text,
  };
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [otherOpen, setOtherOpen] = useState<Record<string, boolean>>({});
  const [pendingDelete, startDelete] = useTransition();

  const [state, formAction, pending] = useActionState<HealthRecordResult | null, FormData>(
    async (_prev, fd) => {
      fd.set("petId", petId);
      // Resuelve los selects con "Otro…": usa el texto capturado.
      for (const f of fields) {
        if (f.type === "select" && f.allowOther && fd.get(f.id) === OTHER_OPTION) {
          fd.set(f.id, String(fd.get(`${f.id}Other`) ?? "").trim());
        }
      }
      const result = await addAction(_prev, fd);
      if (result.ok) {
        toast.success(successMessage);
        setAdding(false);
        setOtherOpen({});
        router.refresh();
      } else {
        toast.error(result.error);
      }
      return result;
    },
    null
  );

  function removeEntry(id: string) {
    if (!confirm("¿Quitar este registro?")) return;
    startDelete(async () => {
      try {
        await deleteAction(id);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  function renderField(f: RecordField) {
    const label = (
      <label
        htmlFor={`rec-${f.id}`}
        className="text-[11px] font-extrabold uppercase tracking-wide truncate"
        style={{ color: t.textMuted }}
      >
        {f.label}
        {!f.required && " · opcional"}
      </label>
    );

    if (f.type === "select") {
      return (
        <div key={f.id} className={`flex flex-col gap-1.5 ${f.full ? "" : "min-w-0 flex-1"}`}>
          {label}
          <select
            id={`rec-${f.id}`}
            name={f.id}
            required={f.required}
            defaultValue={f.defaultValue ?? ""}
            onChange={(e) =>
              f.allowOther &&
              setOtherOpen((s) => ({ ...s, [f.id]: e.target.value === OTHER_OPTION }))
            }
            className={inputClass}
            style={inputStyle}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {(f.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            {f.allowOther && <option value={OTHER_OPTION}>Otro…</option>}
          </select>
          {f.allowOther && otherOpen[f.id] && (
            <input
              type="text"
              name={`${f.id}Other`}
              required
              placeholder="Escribe cuál…"
              className={inputClass}
              style={inputStyle}
            />
          )}
        </div>
      );
    }

    if (f.type === "textarea") {
      return (
        <div key={f.id} className="flex flex-col gap-1.5">
          {label}
          <textarea
            id={`rec-${f.id}`}
            name={f.id}
            rows={3}
            required={f.required}
            placeholder={f.placeholder}
            className="w-full px-4 py-3 rounded-[12px] border text-[14px] outline-none focus:border-[var(--color-brand)] transition resize-none"
            style={{
              background: t.inputBg,
              borderColor: t.border,
              color: t.text,
            }}
          />
        </div>
      );
    }

    return (
      <div key={f.id} className={`flex flex-col gap-1.5 ${f.full ? "" : "min-w-0 flex-1"}`}>
        {label}
        <div className="relative">
          <input
            id={`rec-${f.id}`}
            name={f.id}
            type={f.type}
            required={f.required}
            placeholder={f.placeholder}
            step={f.step}
            min={f.type === "number" ? "0" : undefined}
            inputMode={f.type === "number" ? "decimal" : undefined}
            defaultValue={
              f.defaultValue ?? (f.type === "date" && f.required ? todayInput() : undefined)
            }
            className={inputClass}
            style={{ ...inputStyle, paddingRight: f.suffix ? 40 : undefined }}
          />
          {f.suffix && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold"
              style={{ color: t.textMuted }}
            >
              {f.suffix}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Agrupa campos no-full en pares para compartir fila.
  const rows: RecordField[][] = [];
  for (const f of fields) {
    const last = rows[rows.length - 1];
    if (!f.full && f.type !== "textarea" && last && last.length === 1 && !last[0].full && last[0].type !== "textarea") {
      last.push(f);
    } else {
      rows.push([f]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!readonly && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full py-3 rounded-[14px] flex items-center justify-center gap-2 text-[14px] font-extrabold transition"
          style={{
            background: dark
              ? `${accent}15`
              : "color-mix(in oklab, var(--color-brand) 10%, transparent)",
            border: `1.5px dashed ${accent}`,
            color: accent,
          }}
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      )}

      {!readonly && adding && (
        <form
          action={formAction}
          className="rounded-[20px] p-5 flex flex-col gap-4"
          style={{
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            boxShadow: "0 12px 32px rgba(206, 90, 45, 0.10)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[20px]">{emoji}</span>
              <p className="text-[15px] font-black" style={{ color: t.text }}>
                {formTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAdding(false)}
              aria-label="Cancelar"
              className="w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{
                background: t.cardBgLight,
                color: t.textMuted,
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {rows.map((row, i) =>
            row.length === 2 ? (
              <div key={i} className="flex gap-2">
                {row.map(renderField)}
              </div>
            ) : (
              renderField(row[0])
            )
          )}

          {state && !state.ok && state.error && (
            <p
              className="text-[12px] font-bold flex items-center gap-2 px-3 py-2 rounded-[10px]"
              style={{
                background: "color-mix(in oklab, #ef4444 10%, transparent)",
                color: "#c0392b",
              }}
            >
              ⚠ {state.error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 py-3 rounded-[14px] text-[14px] font-bold transition"
              style={{
                background: t.cardBgLight,
                border: `1px solid ${t.border}`,
                color: t.textMuted,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-[2] py-3 rounded-[14px] text-white text-[14px] font-extrabold transition disabled:opacity-60 hover:brightness-105 active:scale-[.99]"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 65%, oklch(45% 0.12 38)))",
                boxShadow: "0 8px 22px color-mix(in oklab, var(--color-brand) 30%, transparent)",
              }}
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 && !adding && (
        <div
          className="rounded-[18px] py-12 px-6 text-center"
          style={{
            background: t.cardBg,
            border: `1px ${dark ? "dashed" : "solid"} ${t.border}`,
          }}
        >
          <p className="text-[36px] mb-2">{emoji}</p>
          <p className="text-[14px] font-bold" style={{ color: t.text }}>
            {emptyTitle}
          </p>
          <p className="text-[12px] font-semibold mt-1" style={{ color: t.textMuted }}>
            {emptyHint}
          </p>
        </div>
      )}

      {entries.map((e) => {
        const badgeTone = e.badge ? BADGE_TONES[e.badge.tone] : null;
        return (
          <div
            key={e.id}
            className="rounded-[16px] p-4"
            style={{
              background: t.cardBg,
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <p className="text-[15px] font-extrabold" style={{ color: t.text }}>
                {emoji} {e.title}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {e.badge && badgeTone && (
                  <span
                    className="px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap"
                    style={{
                      background: badgeTone.bg,
                      color: badgeTone.color,
                      border: `1px solid ${badgeTone.border}`,
                    }}
                  >
                    {e.badge.label}
                  </span>
                )}
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => removeEntry(e.id)}
                    disabled={pendingDelete}
                    aria-label={`Quitar ${e.title}`}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: t.cardBgLight,
                      color: "#c0392b",
                    }}
                  >
                    {pendingDelete ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-5 flex-wrap mb-2">
              <div>
                <p
                  className="text-[10px] font-extrabold uppercase tracking-wide"
                  style={{ color: t.textMuted }}
                >
                  Fecha
                </p>
                <p className="text-[13px] font-extrabold" style={{ color: t.text }}>
                  {formatLong(e.date)}
                </p>
              </div>
              {e.details.map((d) => (
                <div key={d.label}>
                  <p
                    className="text-[10px] font-extrabold uppercase tracking-wide"
                    style={{ color: t.textMuted }}
                  >
                    {d.label}
                  </p>
                  <p className="text-[13px] font-extrabold" style={{ color: t.text }}>
                    {d.value}
                  </p>
                </div>
              ))}
            </div>

            {e.notes && (
              <p
                className="text-[12px] font-semibold leading-snug"
                style={{ color: t.textDim }}
              >
                {e.notes}
              </p>
            )}
            <p className="text-[11px] font-semibold mt-1.5" style={{ color: t.textMuted }}>
              Registrado por {e.addedByName}
            </p>
          </div>
        );
      })}
    </div>
  );
}
