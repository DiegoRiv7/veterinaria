"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [menuPos, setMenuPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_W = 240;

  // Menú en portal con posición fija: no lo recortan los contenedores ni
  // lo tapan las tarjetas siguientes; se alinea a la derecha del botón.
  function openMenu() {
    const btn = boxRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8));
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const openUp = below < 280 && above > below;
    setMenuPos(
      openUp
        ? { left, bottom: window.innerHeight - r.top + 6 }
        : { left, top: r.bottom + 6 }
    );
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (boxRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll(e: Event) {
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
        onClick={() => (open ? setOpen(false) : openMenu())}
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

      {open && menuPos && typeof document !== "undefined" &&
        createPortal(
        <div
          ref={menuRef}
          className="vet-portal rounded-[14px] border overflow-y-auto py-1"
          style={{
            position: "fixed",
            left: menuPos.left,
            top: menuPos.top,
            bottom: menuPos.bottom,
            width: MENU_W,
            zIndex: 130,
            minHeight: 0,
            maxHeight: "min(320px, calc(100dvh - 24px))",
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
        </div>,
        document.body
      )}
    </div>
  );
}
