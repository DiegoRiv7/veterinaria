"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import {
  addDewormingAction,
  deleteDewormingAction,
  type AddResult,
} from "@/app/actions/cartilla";
import { FancySelect } from "@/components/FancySelect";

export type DewormingEntry = {
  id: string;
  product: string;
  kind: string | null;
  appliedAt: string;
  nextAt: string | null;
  notes: string | null;
  addedByName: string;
};

function formatLong(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function PetDewormingsTab({
  petId,
  items,
  readonly = false,
  dark = false,
  accent = "var(--color-brand)",
}: {
  petId: string;
  items: DewormingEntry[];
  readonly?: boolean;
  dark?: boolean;
  accent?: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState("Interna");
  const [pendingDelete, startDelete] = useTransition();
  const [state, formAction, pending] = useActionState<
    AddResult | { ok: false; error: undefined } | null,
    FormData
  >(async (_prev, fd) => {
    fd.set("petId", petId);
    const result = await addDewormingAction(_prev, fd);
    if (result.ok) {
      toast.success("Desparasitación registrada.");
      setAdding(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    return result;
  }, null);

  function remove(id: string) {
    if (!confirm("¿Quitar esta desparasitación?")) return;
    startDelete(async () => {
      try {
        await deleteDewormingAction(id);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  // Theme tokens
  const t = dark
    ? {
        cardBg: "oklch(24% 0.05 35)",
        cardBgLight: "oklch(28% 0.05 35)",
        border: "oklch(34% 0.05 35)",
        text: "oklch(96% 0.02 60)",
        textDim: "oklch(78% 0.04 60)",
        textMuted: "oklch(58% 0.04 60)",
        inputBg: "oklch(20% 0.04 35)",
        addBg: `${accent}15`,
        addBorder: accent,
      }
    : {
        cardBg: "var(--color-surface)",
        cardBgLight: "var(--color-surface-2, var(--color-surface))",
        border: "var(--color-border)",
        text: "var(--color-foreground)",
        textDim: "var(--color-foreground)",
        textMuted: "var(--color-muted)",
        inputBg: "var(--color-surface-2, var(--color-surface))",
        addBg: "color-mix(in oklab, var(--color-brand) 10%, transparent)",
        addBorder: "var(--color-brand)",
      };

  return (
    <div className="flex flex-col gap-3">
      {!readonly && !adding && (
        <button
          type="button"
          onClick={() => {
            setKind("Interna");
            setAdding(true);
          }}
          className="w-full py-3 rounded-[14px] flex items-center justify-center gap-2 text-[14px] font-extrabold transition"
          style={{
            background: t.addBg,
            border: `1.5px dashed ${t.addBorder}`,
            color: accent,
          }}
        >
          <Plus className="h-4 w-4" /> Agregar desparasitación
        </button>
      )}

      {!readonly && adding && (
        <form
          action={formAction}
          className="rounded-[20px] p-5 flex flex-col gap-4"
          style={{
            background: t.cardBg,
            border: `1px solid ${t.border}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[20px]">💊</span>
              <p className="text-[15px] font-black" style={{ color: t.text }}>
                Nueva desparasitación
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAdding(false)}
              aria-label="Cancelar"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: t.cardBgLight, color: t.textMuted }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Field label="Producto">
            <input
              name="product"
              type="text"
              required
              placeholder="Drontal Plus, Frontline…"
              className="w-full px-4 rounded-[12px] border text-[14px] outline-none transition appearance-none"
              style={{
                height: 48,
                minHeight: 48,
                boxSizing: "border-box",
                background: t.inputBg,
                borderColor: t.border,
                color: t.text,
              }}
            />
          </Field>

          <Field label="Tipo">
            <FancySelect
              name="kind"
              value={kind}
              onChange={setKind}
              required
              options={["Interna", "Externa", "Ambas"].map((o) => ({
                value: o,
                label: o,
              }))}
              dark={dark}
              accent={accent}
            />
          </Field>

          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <Field label="Aplicada">
                <input
                  name="appliedAt"
                  type="date"
                  required
                  className="w-full px-4 rounded-[12px] border text-[14px] outline-none appearance-none"
                  style={{
                    height: 48,
                    minHeight: 48,
                    background: t.inputBg,
                    borderColor: t.border,
                    color: t.text,
                  }}
                />
              </Field>
            </div>
            <div className="flex-1 min-w-0">
              <Field label="Próxima · opcional">
                <input
                  name="nextAt"
                  type="date"
                  className="w-full px-4 rounded-[12px] border text-[14px] outline-none appearance-none"
                  style={{
                    height: 48,
                    minHeight: 48,
                    background: t.inputBg,
                    borderColor: t.border,
                    color: t.text,
                  }}
                />
              </Field>
            </div>
          </div>

          <Field label="Notas · opcional">
            <textarea
              name="notes"
              rows={2}
              placeholder="Observaciones, dosis, marca…"
              className="w-full px-4 py-3 rounded-[12px] border text-[14px] outline-none resize-none"
              style={{
                background: t.inputBg,
                borderColor: t.border,
                color: t.text,
              }}
            />
          </Field>

          {state && !state.ok && state.error && (
            <p
              className="text-[12px] font-bold px-3 py-2 rounded-[10px]"
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
              className="flex-1 py-3 rounded-[14px] text-[14px] font-bold"
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
              className="flex-[2] py-3 rounded-[14px] text-white text-[14px] font-extrabold transition disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${accent}, color-mix(in oklab, ${accent} 70%, oklch(45% 0.12 38)))`,
              }}
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 && !adding && (
        <div
          className="rounded-[18px] py-12 px-6 text-center"
          style={{
            background: t.cardBg,
            border: dark ? `1px dashed ${t.border}` : `1px solid ${t.border}`,
          }}
        >
          <p className="text-[36px] mb-2">💊</p>
          <p className="text-[13px] font-bold" style={{ color: t.text }}>
            Sin desparasitaciones registradas
          </p>
          {!readonly && (
            <p
              className="text-[12px] font-semibold mt-1"
              style={{ color: t.textMuted }}
            >
              Agrega la primera para llevar el control.
            </p>
          )}
        </div>
      )}

      {items.map((d) => (
        <div
          key={d.id}
          className="rounded-[16px] p-4 lg:p-5"
          style={{
            background: t.cardBg,
            border: `1px solid ${t.border}`,
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-[14px] font-black" style={{ color: t.text }}>
              {d.product}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {d.kind && (
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-extrabold"
                  style={{
                    background: `${accent}22`,
                    border: `1px solid ${accent}55`,
                    color: accent,
                  }}
                >
                  {d.kind}
                </span>
              )}
              {!readonly && (
                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  disabled={pendingDelete}
                  aria-label="Quitar"
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
          <div className="grid grid-cols-2 gap-3 mb-3">
            <KV label="APLICADA" value={formatLong(d.appliedAt)} muted={t.textMuted} text={t.text} />
            <KV
              label="PRÓXIMA"
              value={d.nextAt ? formatLong(d.nextAt) : "—"}
              muted={t.textMuted}
              text={d.nextAt ? accent : t.text}
            />
          </div>
          {d.notes && (
            <div
              className="rounded-[10px] px-3 py-2.5 mb-2"
              style={{ background: t.cardBgLight }}
            >
              <p
                className="text-[9px] font-extrabold tracking-[0.5px] mb-1"
                style={{ color: t.textMuted }}
              >
                NOTAS
              </p>
              <p
                className="text-[12px] font-semibold leading-snug"
                style={{ color: t.textDim }}
              >
                {d.notes}
              </p>
            </div>
          )}
          <p
            className="text-[10px] font-semibold"
            style={{ color: t.textMuted }}
          >
            Registrado por {d.addedByName}
          </p>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[11px] font-extrabold uppercase tracking-wide"
        style={{ color: "color-mix(in oklab, currentColor 60%, transparent)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function KV({
  label,
  value,
  muted,
  text,
}: {
  label: string;
  value: string;
  muted: string;
  text: string;
}) {
  return (
    <div>
      <p
        className="text-[10px] font-extrabold tracking-[1px] mb-0.5"
        style={{ color: muted }}
      >
        {label}
      </p>
      <p
        className="text-[13px] font-extrabold"
        style={{
          color: text,
          fontFamily: "var(--font-space-grotesk), sans-serif",
        }}
      >
        {value}
      </p>
    </div>
  );
}
