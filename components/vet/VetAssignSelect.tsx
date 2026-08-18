"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { reassignAppointmentVetAction } from "@/app/actions/appointments";

export type VetOption = {
  vetId: string;
  name: string;
  /** true si el médico ya tiene otra cita encimada en este horario */
  busy: boolean;
};

/**
 * Selector del médico asignado a la cita (fila "Médico" de la tarjeta de
 * estado). Lista solo médicos registrados; los que ya tienen una cita a
 * esa hora aparecen con punto rojo "Ocupado" y no se pueden elegir.
 */
export function VetAssignSelect({
  appointmentId,
  currentVetId,
  options,
}: {
  appointmentId: string;
  currentVetId: string;
  options: VetOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
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

  const current = options.find((o) => o.vetId === currentVetId);

  async function choose(option: VetOption) {
    if (saving) return;
    if (option.vetId === currentVetId) {
      setOpen(false);
      return;
    }
    if (option.busy) return;
    setSaving(true);
    const res = await reassignAppointmentVetAction({
      appointmentId,
      vetId: option.vetId,
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      toast.success(`Cita asignada a ${option.name}.`);
      router.refresh();
    } else {
      toast.error(res.error);
      router.refresh();
    }
  }

  return (
    <div ref={boxRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        title="Cambiar médico asignado"
        className="inline-flex items-center gap-1 text-[13px] font-extrabold cursor-pointer transition hover:opacity-80 disabled:opacity-60"
        style={{ color: "var(--vet-green)" }}
      >
        {saving ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <ChevronDown size={13} strokeWidth={3} />
        )}
        {current?.name ?? "Sin médico"}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-[240px] rounded-[14px] border z-50 overflow-hidden py-1"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            boxShadow: "0 14px 34px -14px rgba(0,0,0,0.28)",
          }}
        >
          {options.map((o) => {
            const isCurrent = o.vetId === currentVetId;
            const blocked = o.busy && !isCurrent;
            return (
              <button
                key={o.vetId}
                type="button"
                onClick={() => choose(o)}
                disabled={blocked || saving}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left transition enabled:hover:brightness-95 enabled:cursor-pointer disabled:cursor-not-allowed"
                style={{ background: "var(--vet-bg-card)" }}
              >
                <span
                  className="text-[13px] font-bold truncate inline-flex items-center gap-1.5"
                  style={{
                    color: blocked ? "var(--vet-text-3)" : "var(--vet-text-1)",
                  }}
                >
                  {isCurrent && (
                    <Check size={13} strokeWidth={3} style={{ color: "var(--vet-green)" }} />
                  )}
                  {o.name}
                </span>
                {blocked ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] shrink-0"
                    style={{ color: "var(--vet-red)" }}
                  >
                    <span
                      aria-hidden
                      className="w-2 h-2 rounded-full"
                      style={{ background: "var(--vet-red)" }}
                    />
                    Ocupado
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] shrink-0"
                    style={{ color: isCurrent ? "var(--vet-text-3)" : "var(--vet-green)" }}
                  >
                    {isCurrent ? (
                      "Asignado"
                    ) : (
                      <>
                        <span
                          aria-hidden
                          className="w-2 h-2 rounded-full"
                          style={{ background: "var(--vet-green)" }}
                        />
                        Disponible
                      </>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
