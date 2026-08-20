"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Loader2, X } from "lucide-react";
import { FancySelect, VET_TOKENS } from "@/components/FancySelect";
import { rescheduleAppointmentAction } from "@/app/actions/appointments";
import { clinicDateInput, clinicTimeInput } from "@/lib/clinic-time";

/**
 * Botón "Reagendar" del detalle de cita: abre un diálogo para cambiar
 * la fecha/hora de la consulta y, si hace falta, el servicio (motivo).
 */
export function RescheduleDialog({
  appointmentId,
  scheduledAtIso,
  currentServiceId,
  services,
}: {
  appointmentId: string;
  scheduledAtIso: string;
  currentServiceId: string;
  services: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [serviceId, setServiceId] = useState(currentServiceId);

  function openDialog() {
    // Prellenar con hora de la clínica, no la del dispositivo.
    setDate(clinicDateInput(scheduledAtIso));
    setTime(clinicTimeInput(scheduledAtIso));
    setServiceId(currentServiceId);
    setOpen(true);
  }

  async function save() {
    if (saving) return;
    if (!date || !time) {
      toast.error("Selecciona fecha y hora.");
      return;
    }
    setSaving(true);
    const res = await rescheduleAppointmentAction(appointmentId, {
      date,
      time,
      serviceId,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Cita reagendada");
      setOpen(false);
      router.refresh();
    } else {
      toast.error("No se pudo reagendar", { description: res.error });
    }
  }

  const inputClass =
    "h-12 w-full rounded-[12px] border px-4 text-[15px] outline-none transition focus:border-[color:var(--vet-green)] focus:ring-2 focus:ring-[color:var(--vet-green-glow)]";
  const inputStyle: React.CSSProperties = {
    background: "var(--vet-bg-card)",
    borderColor: "var(--vet-border)",
    color: "var(--vet-text-1)",
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="h-12 px-4 rounded-[14px] text-[14px] font-extrabold border inline-flex items-center justify-center gap-2 transition hover:brightness-105 w-full"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          color: "var(--vet-text-2)",
        }}
      >
        <CalendarClock className="h-4 w-4" />
        Reagendar
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="vet-portal fixed inset-0 z-[90] flex items-center justify-center p-4">
            {/* Fondo */}
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => !saving && setOpen(false)}
              className="absolute inset-0 cursor-default"
              style={{ background: "rgba(60, 30, 12, 0.35)" }}
            />

            <div
              className="relative w-full max-w-[420px] rounded-[18px] border p-5 flex flex-col gap-4"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className="text-[16px] font-black leading-tight"
                    style={{ color: "var(--vet-text-1)" }}
                  >
                    Reagendar cita
                  </p>
                  <p
                    className="text-[12px] font-semibold mt-0.5"
                    style={{ color: "var(--vet-text-3)" }}
                  >
                    Cambia la fecha, la hora o el motivo de la consulta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setOpen(false)}
                  aria-label="Cerrar"
                  className="w-9 h-9 shrink-0 rounded-[10px] border inline-flex items-center justify-center transition hover:brightness-105"
                  style={{
                    background: "var(--vet-bg-card)",
                    borderColor: "var(--vet-border)",
                    color: "var(--vet-text-2)",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[13px] font-extrabold"
                    style={{ color: "var(--vet-text-1)" }}
                  >
                    Fecha
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    style={inputStyle}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[13px] font-extrabold"
                    style={{ color: "var(--vet-text-1)" }}
                  >
                    Hora
                  </label>
                  <input
                    type="time"
                    className={inputClass}
                    style={inputStyle}
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[13px] font-extrabold"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  Motivo / servicio
                </label>
                <FancySelect
                  value={serviceId}
                  onChange={setServiceId}
                  required
                  disabled={saving}
                  options={services.map((s) => ({ value: s.id, label: s.name }))}
                  fontSize={15}
                  accent="var(--vet-green)"
                  tokens={VET_TOKENS}
                />
                <p
                  className="text-[11.5px] font-semibold"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  Al cambiar el servicio se recalculan duración y precio
                  estimado.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className="h-11 px-4 rounded-[12px] text-[13px] font-extrabold border transition hover:brightness-105 disabled:opacity-60"
                  style={{
                    background: "var(--vet-bg-card)",
                    borderColor: "var(--vet-border)",
                    color: "var(--vet-text-2)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="h-11 px-5 rounded-[12px] text-[13px] font-extrabold text-white transition hover:brightness-110 disabled:opacity-60 inline-flex items-center gap-2"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in oklab, var(--vet-green-dim) 82%, black), var(--vet-green-dim))",
                    boxShadow: "0 10px 24px var(--vet-green-glow)",
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    "Reagendar"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
