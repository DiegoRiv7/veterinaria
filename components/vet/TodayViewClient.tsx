"use client";

import { useState } from "react";
import { AppointmentRow } from "./AppointmentRow";

type ApptLite = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  pet: { name: string; species: string };
  client: { name: string };
  service: { name: string };
};

type FilterValue = "todas" | "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "SCHEDULED", label: "Agendada" },
  { value: "COMPLETED", label: "Completada" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "NO_SHOW", label: "No vino" },
];

const DOT_COLOR: Record<string, string> = {
  SCHEDULED: "oklch(36% 0.16 155)",
  COMPLETED: "oklch(40% 0.20 255)",
  CANCELLED: "oklch(40% 0.18 20)",
  NO_SHOW: "oklch(48% 0.15 55)",
};

type Props = {
  appts: ApptLite[];
  headerDate: string;
  initialFilter?: FilterValue;
  hideHeader?: boolean;
};

export function TodayViewClient({
  appts,
  headerDate,
  initialFilter = "todas",
  hideHeader = false,
}: Props) {
  const [filter, setFilter] = useState<FilterValue>(initialFilter);
  const visible = filter === "todas" ? appts : appts.filter((a) => a.status === filter);

  return (
    <div className="flex flex-col gap-5">
      {!hideHeader && (
        <div>
          <h2 className="text-[22px] font-black tracking-tight" style={{ color: "var(--vet-text-1)" }}>
            Citas de Hoy
          </h2>
          <div className="text-[13px] font-semibold capitalize" style={{ color: "var(--vet-text-3)" }}>
            {headerDate} · {appts.length} {appts.length === 1 ? "cita programada" : "citas programadas"}
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors border"
              style={{
                borderColor: active ? "var(--vet-green)" : "var(--vet-border)",
                background: active ? "var(--vet-green-glow)" : "transparent",
                color: active ? "var(--vet-green)" : "var(--vet-text-2)",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {visible.length === 0 ? (
        <div
          className="py-14 px-4 text-center border rounded-[22px]"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-3)",
          }}
        >
          <div className="text-[40px] mb-2">☕</div>
          <div className="text-[14px] font-bold" style={{ color: "var(--vet-text-2)" }}>
            Sin citas en este filtro
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((appt, i) => (
            <div key={appt.id} className="flex gap-3.5">
              <div className="flex flex-col items-center w-5 flex-shrink-0">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-[18px] flex-shrink-0"
                  style={{ background: DOT_COLOR[appt.status] ?? "var(--vet-green)" }}
                />
                {i < visible.length - 1 && (
                  <div className="w-[2px] flex-1 mt-1 rounded" style={{ background: "var(--vet-border)" }} />
                )}
              </div>
              <div className="flex-1 pb-1.5">
                <AppointmentRow
                  appt={{
                    ...appt,
                    scheduledAt: appt.scheduledAt,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
