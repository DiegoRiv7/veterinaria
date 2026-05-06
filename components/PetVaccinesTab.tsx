"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import {
  addVaccineAction,
  deleteVaccineAction,
  type AddVaccineResult,
} from "@/app/actions/vaccines";

export type VaccineEntry = {
  id: string;
  name: string;
  appliedAt: string;
  nextAt: string | null;
  notes: string | null;
  addedByName: string;
  status: "al día" | "próxima" | "vencida" | "—";
};

const STATUS_BADGE: Record<
  VaccineEntry["status"],
  { bg: string; color: string; border: string }
> = {
  "al día": {
    bg: "color-mix(in oklab, var(--vet-green, #2f7d4f) 12%, transparent)",
    color: "var(--vet-green, #2f7d4f)",
    border: "color-mix(in oklab, var(--vet-green, #2f7d4f) 28%, transparent)",
  },
  próxima: {
    bg: "color-mix(in oklab, var(--vet-amber, #d49247) 14%, transparent)",
    color: "var(--vet-amber, #b46e3e)",
    border: "color-mix(in oklab, var(--vet-amber, #d49247) 32%, transparent)",
  },
  vencida: {
    bg: "color-mix(in oklab, #ef4444 12%, transparent)",
    color: "#c0392b",
    border: "color-mix(in oklab, #ef4444 28%, transparent)",
  },
  "—": {
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

export function PetVaccinesTab({
  petId,
  vaccines,
  readonly = false,
}: {
  petId: string;
  vaccines: VaccineEntry[];
  readonly?: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pendingDelete, startDelete] = useTransition();
  const [state, formAction, pending] = useActionState<
    AddVaccineResult | { ok: false; error: undefined } | null,
    FormData
  >(async (_prev, fd) => {
    fd.set("petId", petId);
    const result = await addVaccineAction(_prev, fd);
    if (result.ok) {
      toast.success("Vacuna registrada.");
      setAdding(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    return result;
  }, null);

  function removeVaccine(id: string) {
    if (!confirm("¿Quitar esta vacuna?")) return;
    startDelete(async () => {
      try {
        await deleteVaccineAction(id);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {!readonly && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full py-3 rounded-[14px] flex items-center justify-center gap-2 text-[14px] font-extrabold transition"
          style={{
            background:
              "color-mix(in oklab, var(--color-brand) 10%, transparent)",
            border: "1.5px dashed var(--color-brand)",
            color: "var(--color-brand)",
          }}
        >
          <Plus className="h-4 w-4" /> Agregar vacuna
        </button>
      )}

      {!readonly && adding && (
        <form
          action={formAction}
          className="rounded-[20px] p-5 flex flex-col gap-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 12px 32px rgba(206, 90, 45, 0.10)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[20px]">💉</span>
              <p
                className="text-[15px] font-black"
                style={{ color: "var(--color-foreground)" }}
              >
                Nueva vacuna
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAdding(false)}
              aria-label="Cancelar"
              className="w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{
                background: "var(--color-surface-2, var(--color-surface))",
                color: "var(--color-muted)",
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="vaccine-name"
              className="text-[11px] font-extrabold uppercase tracking-wide"
              style={{ color: "var(--color-muted)" }}
            >
              Nombre
            </label>
            <input
              id="vaccine-name"
              name="name"
              type="text"
              required
              placeholder="Antirrábica, Pentavalente…"
              className="w-full px-4 rounded-[12px] border text-[14px] outline-none focus:border-[var(--color-brand)] transition appearance-none"
              style={{
                height: 48,
                minHeight: 48,
                boxSizing: "border-box",
                WebkitAppearance: "none",
                background: "var(--color-surface-2, var(--color-surface))",
                borderColor: "var(--color-border)",
                color: "var(--color-foreground)",
              }}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <label
                htmlFor="vaccine-applied"
                className="text-[11px] font-extrabold uppercase tracking-wide"
                style={{ color: "var(--color-muted)" }}
              >
                Aplicada
              </label>
              <input
                id="vaccine-applied"
                name="appliedAt"
                type="date"
                required
                className="w-full px-4 rounded-[12px] border text-[14px] outline-none focus:border-[var(--color-brand)] transition appearance-none"
                style={{
                  height: 48,
                  minHeight: 48,
                  boxSizing: "border-box",
                  WebkitAppearance: "none",
                  background: "var(--color-surface-2, var(--color-surface))",
                  borderColor: "var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <label
                htmlFor="vaccine-next"
                className="text-[11px] font-extrabold uppercase tracking-wide truncate"
                style={{ color: "var(--color-muted)" }}
              >
                Próxima · opcional
              </label>
              <input
                id="vaccine-next"
                name="nextAt"
                type="date"
                className="w-full px-4 rounded-[12px] border text-[14px] outline-none focus:border-[var(--color-brand)] transition appearance-none"
                style={{
                  height: 48,
                  minHeight: 48,
                  boxSizing: "border-box",
                  WebkitAppearance: "none",
                  background: "var(--color-surface-2, var(--color-surface))",
                  borderColor: "var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="vaccine-notes"
              className="text-[11px] font-extrabold uppercase tracking-wide"
              style={{ color: "var(--color-muted)" }}
            >
              Notas · opcional
            </label>
            <textarea
              id="vaccine-notes"
              name="notes"
              rows={3}
              placeholder="Marca, lote, reacciones…"
              className="w-full px-4 py-3 rounded-[12px] border text-[14px] outline-none focus:border-[var(--color-brand)] transition resize-none"
              style={{
                background: "var(--color-surface-2, var(--color-surface))",
                borderColor: "var(--color-border)",
                color: "var(--color-foreground)",
              }}
            />
          </div>

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
                background: "var(--color-surface-2, var(--color-surface))",
                border: "1px solid var(--color-border)",
                color: "var(--color-muted)",
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
                boxShadow:
                  "0 8px 22px color-mix(in oklab, var(--color-brand) 30%, transparent)",
              }}
            >
              {pending ? "Guardando…" : "Guardar vacuna"}
            </button>
          </div>
        </form>
      )}

      {vaccines.length === 0 && !adding && (
        <div
          className="rounded-[18px] py-12 px-6 text-center"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-[36px] mb-2">💉</p>
          <p
            className="text-[14px] font-bold"
            style={{ color: "var(--color-foreground)" }}
          >
            Sin vacunas registradas
          </p>
          <p
            className="text-[12px] font-semibold mt-1"
            style={{ color: "var(--color-muted)" }}
          >
            {readonly
              ? "El dueño todavía no registró vacunas para esta mascota."
              : "Agrega las vacunas que ya tiene tu mascota."}
          </p>
        </div>
      )}

      {vaccines.map((v) => {
        const s = STATUS_BADGE[v.status];
        return (
          <div
            key={v.id}
            className="rounded-[16px] p-4"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <p
                className="text-[15px] font-extrabold"
                style={{ color: "var(--color-foreground)" }}
              >
                💉 {v.name}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap"
                  style={{
                    background: s.bg,
                    color: s.color,
                    border: `1px solid ${s.border}`,
                  }}
                >
                  {v.status}
                </span>
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => removeVaccine(v.id)}
                    disabled={pendingDelete}
                    aria-label={`Quitar ${v.name}`}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--color-surface-2, var(--color-surface))",
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
            <div className="flex gap-5 mb-2">
              <div>
                <p
                  className="text-[10px] font-extrabold uppercase tracking-wide"
                  style={{ color: "var(--color-muted)" }}
                >
                  Aplicada
                </p>
                <p
                  className="text-[13px] font-extrabold"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {formatLong(v.appliedAt)}
                </p>
              </div>
              {v.nextAt && (
                <div>
                  <p
                    className="text-[10px] font-extrabold uppercase tracking-wide"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Próxima
                  </p>
                  <p
                    className="text-[13px] font-extrabold"
                    style={{
                      color:
                        v.status === "al día"
                          ? "var(--vet-green, #2f7d4f)"
                          : v.status === "próxima"
                          ? "var(--vet-amber, #b46e3e)"
                          : v.status === "vencida"
                          ? "#c0392b"
                          : "var(--color-foreground)",
                    }}
                  >
                    {formatLong(v.nextAt)}
                  </p>
                </div>
              )}
            </div>
            {v.notes && (
              <p
                className="text-[12px] font-semibold leading-snug"
                style={{ color: "var(--color-muted)" }}
              >
                {v.notes}
              </p>
            )}
            <p
              className="text-[11px] font-semibold mt-1.5"
              style={{ color: "var(--color-muted)" }}
            >
              Registrada por {v.addedByName}
            </p>
          </div>
        );
      })}
    </div>
  );
}
