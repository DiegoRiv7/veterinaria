"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import {
  addSurgeryAction,
  deleteSurgeryAction,
  type AddResult,
} from "@/app/actions/cartilla";
import { updateHealthRecordAction } from "@/app/actions/record-edits";
import { RecordHistoryEye, type RecordChange } from "@/components/RecordHistoryEye";
import { clinicDateInput } from "@/lib/clinic-time";

const SURGERY_FIELD_LABELS: Record<string, string> = {
  name: "Procedimiento",
  performedAt: "Fecha",
  clinic: "Clínica",
  notes: "Notas",
};

export type SurgeryEntry = {
  id: string;
  name: string;
  performedAt: string;
  clinic: string | null;
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

export function PetSurgeriesTab({
  petId,
  items,
  readonly = false,
  dark = false,
  accent = "var(--color-brand)",
  changesByRecord = {},
}: {
  petId: string;
  items: SurgeryEntry[];
  readonly?: boolean;
  dark?: boolean;
  accent?: string;
  changesByRecord?: Record<string, RecordChange[]>;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SurgeryEntry | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  function closeForm() {
    setAdding(false);
    setEditing(null);
  }

  const [state, formAction, pending] = useActionState<
    AddResult | { ok: false; error: undefined } | null,
    FormData
  >(async (_prev, fd) => {
    if (editing) {
      const result = await updateHealthRecordAction({
        type: "surgery",
        id: editing.id,
        values: {
          name: String(fd.get("name") ?? ""),
          performedAt: String(fd.get("performedAt") ?? ""),
          clinic: String(fd.get("clinic") ?? ""),
          notes: String(fd.get("notes") ?? ""),
        },
      });
      if (result.ok) {
        toast.success("Procedimiento actualizado.");
        closeForm();
        router.refresh();
        return { ok: true, id: editing.id } as never;
      }
      toast.error(result.error);
      return result as never;
    }
    fd.set("petId", petId);
    const result = await addSurgeryAction(_prev, fd);
    if (result.ok) {
      toast.success("Procedimiento registrado.");
      closeForm();
      router.refresh();
    } else {
      toast.error(result.error);
    }
    return result;
  }, null);

  function remove(id: string) {
    if (!confirm("¿Quitar este procedimiento?")) return;
    startDelete(async () => {
      try {
        await deleteSurgeryAction(id);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

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
      };

  return (
    <div className="flex flex-col gap-3">
      {!readonly && !adding && !editing && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full py-3 rounded-[14px] flex items-center justify-center gap-2 text-[14px] font-extrabold transition"
          style={{
            background: t.addBg,
            border: `1.5px dashed ${accent}`,
            color: accent,
          }}
        >
          <Plus className="h-4 w-4" /> Agregar procedimiento
        </button>
      )}

      {!readonly && (adding || editing) && (
        <form
          key={editing?.id ?? "new"}
          action={formAction}
          className="rounded-[20px] p-5 flex flex-col gap-4"
          style={{
            background: t.cardBg,
            border: `1px solid ${t.border}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[20px]">🔪</span>
              <p className="text-[15px] font-black" style={{ color: t.text }}>
                {editing ? `Editar — ${editing.name}` : "Nuevo procedimiento"}
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Cancelar"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: t.cardBgLight, color: t.textMuted }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-extrabold uppercase tracking-wide"
              style={{ color: t.textMuted }}
            >
              Nombre
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={editing?.name}
              placeholder="Esterilización, limpieza dental…"
              className="w-full px-4 rounded-[12px] border text-[14px] outline-none appearance-none"
              style={{
                height: 48,
                minHeight: 48,
                boxSizing: "border-box",
                background: t.inputBg,
                borderColor: t.border,
                color: t.text,
              }}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <label
                className="text-[11px] font-extrabold uppercase tracking-wide"
                style={{ color: t.textMuted }}
              >
                Fecha
              </label>
              <input
                name="performedAt"
                type="date"
                required
                defaultValue={editing ? clinicDateInput(editing.performedAt) : undefined}
                className="w-full px-4 rounded-[12px] border text-[14px] outline-none appearance-none"
                style={{
                  height: 48,
                  minHeight: 48,
                  background: t.inputBg,
                  borderColor: t.border,
                  color: t.text,
                }}
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <label
                className="text-[11px] font-extrabold uppercase tracking-wide"
                style={{ color: t.textMuted }}
              >
                Clínica · opcional
              </label>
              <input
                name="clinic"
                type="text"
                defaultValue={editing?.clinic ?? undefined}
                placeholder="Vetsfriend"
                className="w-full px-4 rounded-[12px] border text-[14px] outline-none appearance-none"
                style={{
                  height: 48,
                  minHeight: 48,
                  background: t.inputBg,
                  borderColor: t.border,
                  color: t.text,
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-extrabold uppercase tracking-wide"
              style={{ color: t.textMuted }}
            >
              Notas · opcional
            </label>
            <textarea
              name="notes"
              defaultValue={editing?.notes ?? undefined}
              rows={3}
              placeholder="Procedimiento, recuperación, observaciones…"
              className="w-full px-4 py-3 rounded-[12px] border text-[14px] outline-none resize-none"
              style={{
                background: t.inputBg,
                borderColor: t.border,
                color: t.text,
              }}
            />
          </div>

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
              onClick={closeForm}
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
              {pending ? "Guardando…" : editing ? "Guardar cambios" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 && !adding && !editing && (
        <div
          className="rounded-[18px] py-12 px-6 text-center"
          style={{
            background: t.cardBg,
            border: dark ? `1px dashed ${t.border}` : `1px solid ${t.border}`,
          }}
        >
          <p className="text-[36px] mb-2">🔪</p>
          <p className="text-[13px] font-bold" style={{ color: t.text }}>
            Sin procedimientos registrados
          </p>
        </div>
      )}

      {items.map((s) => {
        const editable = !readonly && !s.id.startsWith("appt-");
        return (
        <div
          key={s.id}
          onClick={() => editable && setEditing(s)}
          title={editable ? "Clic para editar" : undefined}
          className={`rounded-[16px] p-4 lg:p-5 transition ${
            editable ? "cursor-pointer hover:brightness-[0.985]" : ""
          }`}
          style={{
            background: t.cardBg,
            border: `1px solid ${editing?.id === s.id ? accent : t.border}`,
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-[15px] font-black" style={{ color: t.text }}>
                {s.name}
              </p>
              <RecordHistoryEye
                changes={changesByRecord[s.id] ?? []}
                title={s.name}
                fieldLabels={SURGERY_FIELD_LABELS}
                dark={dark}
              />
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  remove(s.id);
                }}
                disabled={pendingDelete}
                aria-label="Quitar"
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
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
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p
                className="text-[10px] font-extrabold tracking-[1px] mb-0.5"
                style={{ color: t.textMuted }}
              >
                FECHA
              </p>
              <p
                className="text-[13px] font-extrabold"
                style={{
                  color: t.text,
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                }}
              >
                {formatLong(s.performedAt)}
              </p>
            </div>
            <div>
              <p
                className="text-[10px] font-extrabold tracking-[1px] mb-0.5"
                style={{ color: t.textMuted }}
              >
                CLÍNICA
              </p>
              <p
                className="text-[13px] font-extrabold"
                style={{ color: t.text }}
              >
                {s.clinic || "—"}
              </p>
            </div>
          </div>
          {s.notes && (
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
                {s.notes}
              </p>
            </div>
          )}
          <p
            className="text-[10px] font-semibold"
            style={{ color: t.textMuted }}
          >
            Registrado por {s.addedByName}
          </p>
        </div>
        );
      })}
    </div>
  );
}
