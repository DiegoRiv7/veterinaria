"use client";

import { useState, useTransition } from "react";
import { Check, Clock } from "lucide-react";
import { updateScheduleAction } from "@/app/actions/admin";
import { toast } from "sonner";

type Day = {
  dayOfWeek: number;
  label: string;
  isOpen: boolean;
  openMinutes: number;
  closeMinutes: number;
  slotMinutes: number;
};

function minutesToHHMM(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function hhmmToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function ClinicScheduleEditor({ days }: { days: Day[] }) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
      {days.map((d) => (
        <DayCard key={d.dayOfWeek} initial={d} />
      ))}
    </div>
  );
}

function DayCard({ initial }: { initial: Day }) {
  const [isOpen, setIsOpen] = useState(initial.isOpen);
  const [open, setOpen] = useState(minutesToHHMM(initial.openMinutes));
  const [close, setClose] = useState(minutesToHHMM(initial.closeMinutes));
  const [slot, setSlot] = useState(initial.slotMinutes);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function save() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("dayOfWeek", String(initial.dayOfWeek));
        if (isOpen) fd.set("isOpen", "on");
        fd.set("openTime", open);
        fd.set("closeTime", close);
        fd.set("slotMinutes", String(slot));
        await updateScheduleAction(fd);
        setSavedAt(Date.now());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  const slotsAvailable = isOpen
    ? Math.max(
        0,
        Math.floor((hhmmToMinutes(close) - hhmmToMinutes(open)) / slot)
      )
    : 0;

  return (
    <div
      className="border p-5 rounded-[18px] flex flex-col gap-3"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        opacity: isOpen ? 1 : 0.78,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-extrabold text-[15px]"
          style={{ color: "var(--vet-text-1)" }}
        >
          {initial.label}
        </span>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span
            className="text-[12px] font-extrabold"
            style={{ color: isOpen ? "var(--vet-green)" : "var(--vet-text-3)" }}
          >
            {isOpen ? "Abierto" : "Cerrado"}
          </span>
          <span
            role="switch"
            aria-checked={isOpen}
            onClick={() => setIsOpen((v) => !v)}
            className="relative inline-flex h-6 w-11 rounded-full transition-colors cursor-pointer"
            style={{
              background: isOpen ? "var(--vet-green)" : "var(--vet-bg-hover)",
            }}
          >
            <span
              className="inline-block h-5 w-5 rounded-full bg-white transition-transform shadow-sm"
              style={{
                transform: `translate(${isOpen ? 22 : 2}px, 2px)`,
              }}
            />
          </span>
        </label>
      </div>

      <div
        className="grid grid-cols-3 gap-2"
        style={{ pointerEvents: isOpen ? "auto" : "none" }}
      >
        <div>
          <label
            className="block text-[10px] font-extrabold uppercase tracking-wider mb-1"
            style={{ color: "var(--vet-text-3)" }}
          >
            Abre
          </label>
          <input
            type="time"
            value={open}
            onChange={(e) => setOpen(e.target.value)}
            className="w-full h-10 px-3 rounded-[10px] border outline-none text-[13px] font-bold"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-1)",
            }}
          />
        </div>
        <div>
          <label
            className="block text-[10px] font-extrabold uppercase tracking-wider mb-1"
            style={{ color: "var(--vet-text-3)" }}
          >
            Cierra
          </label>
          <input
            type="time"
            value={close}
            onChange={(e) => setClose(e.target.value)}
            className="w-full h-10 px-3 rounded-[10px] border outline-none text-[13px] font-bold"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-1)",
            }}
          />
        </div>
        <div>
          <label
            className="block text-[10px] font-extrabold uppercase tracking-wider mb-1"
            style={{ color: "var(--vet-text-3)" }}
          >
            Slot
          </label>
          <input
            type="number"
            min={10}
            step={5}
            value={slot}
            onChange={(e) => setSlot(Number(e.target.value) || 30)}
            className="w-full h-10 px-3 rounded-[10px] border outline-none text-[13px] font-bold text-center vet-mono"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-1)",
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1">
        <span
          className="text-[11px] font-bold flex items-center gap-1.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          <Clock size={12} />
          {isOpen ? `${slotsAvailable} citas posibles` : "Sin agenda"}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[12px] font-extrabold text-white transition-all disabled:opacity-60"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
            boxShadow: "0 4px 12px var(--vet-green-glow)",
          }}
        >
          {pending ? (
            "Guardando…"
          ) : savedAt && Date.now() - savedAt < 2500 ? (
            <>
              <Check size={14} /> Guardado
            </>
          ) : (
            "Guardar"
          )}
        </button>
      </div>
    </div>
  );
}
