import Link from "next/link";
import { SPECIES_EMOJI } from "@/lib/utils";
import { StatusBadge, statusToVariant } from "./StatusBadge";

type Appt = {
  id: string;
  scheduledAt: Date | string;
  durationMinutes: number;
  status: string;
  pet: { name: string; species: string };
  client: { name: string };
  service: { name: string; category?: "CLINICAL" | "AESTHETIC" };
};

function formatTimeShort(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function AppointmentRow({ appt, compact }: { appt: Appt; compact?: boolean }) {
  const species = appt.pet.species as keyof typeof SPECIES_EMOJI;
  return (
    <Link
      href={`/vet/cita/${appt.id}`}
      className="flex items-center gap-3 sm:gap-3.5 border transition-colors no-underline"
      style={{
        padding: compact ? "10px 14px" : "13px 16px",
        borderRadius: 12,
        background: "var(--vet-bg-mid)",
        borderColor: "var(--vet-border)",
        color: "var(--vet-text-1)",
      }}
    >
      <div className="w-12 text-center flex-shrink-0">
        <div className="vet-mono text-[14px] font-bold" style={{ color: "var(--vet-text-1)" }}>
          {formatTimeShort(appt.scheduledAt)}
        </div>
        <div className="text-[10px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
          {appt.durationMinutes}min
        </div>
      </div>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 border"
        style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
      >
        {SPECIES_EMOJI[species] ?? "🐾"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-extrabold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
            {appt.pet.name}
          </span>
          <span className="text-[11px] font-semibold" style={{ color: "var(--vet-text-3)" }}>•</span>
          <span className="text-[12px] font-semibold truncate" style={{ color: "var(--vet-text-2)" }}>
            {appt.client.name}
          </span>
        </div>
        <div className="text-[12px] font-semibold mt-0.5 truncate flex items-center gap-1.5" style={{ color: "var(--vet-text-3)" }}>
          {appt.service.category === "AESTHETIC" ? (
            <span aria-label="Estético" title="Estético">✂️</span>
          ) : (
            <span aria-label="Clínico" title="Clínico">🩺</span>
          )}
          {appt.service.name}
        </div>
      </div>
      <StatusBadge variant={statusToVariant(appt.status)} />
    </Link>
  );
}
