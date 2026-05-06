"use client";
import { useState } from "react";
import Link from "next/link";
import { PetVaccinesTab, type VaccineEntry } from "@/components/PetVaccinesTab";

type InfoRow = { label: string; value: string };
type ApptItem = {
  id: string;
  type: string;
  date: string;
  timestamp: number;
  status: string;
  vet: string;
  vetPhotoUrl?: string | null;
  notes: string | null;
};

const APPT_BADGE: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  SCHEDULED: {
    label: "Próxima",
    bg: "color-mix(in oklab, var(--vet-green, #2f7d4f) 12%, transparent)",
    color: "var(--vet-green, #2f7d4f)",
    border: "color-mix(in oklab, var(--vet-green, #2f7d4f) 28%, transparent)",
  },
  COMPLETED: {
    label: "Completada",
    bg: "color-mix(in oklab, var(--color-brand) 12%, transparent)",
    color: "var(--color-brand)",
    border: "color-mix(in oklab, var(--color-brand) 28%, transparent)",
  },
  CANCELLED: {
    label: "Cancelada",
    bg: "color-mix(in oklab, #ef4444 12%, transparent)",
    color: "#c0392b",
    border: "color-mix(in oklab, #ef4444 28%, transparent)",
  },
  NO_SHOW: {
    label: "No asistió",
    bg: "color-mix(in oklab, #b46e3e 12%, transparent)",
    color: "#a8431a",
    border: "color-mix(in oklab, #b46e3e 28%, transparent)",
  },
};

export function PetDetailTabs({
  petId,
  info,
  vaccines,
  appts,
}: {
  petId: string;
  info: InfoRow[];
  vaccines: VaccineEntry[];
  appts: ApptItem[];
}) {
  const [tab, setTab] = useState<"info" | "vacunas" | "citas">("info");

  return (
    <>
      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-[14px] mb-4"
        style={{ background: "var(--color-surface-2, var(--color-surface))" }}
      >
        {(
          [
            { id: "info" as const, label: "Info" },
            { id: "vacunas" as const, label: "Vacunas" },
            { id: "citas" as const, label: "Citas" },
          ]
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 rounded-[10px] text-[13px] capitalize transition-all"
              style={{
                background: active ? "var(--color-surface)" : "transparent",
                color: active ? "var(--color-foreground)" : "var(--color-muted)",
                fontWeight: active ? 800 : 600,
                boxShadow: active ? "0 1px 4px var(--color-border)" : "none",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "info" && (
        <div
          className="rounded-[18px] overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {info.map((row, i, arr) => (
            <div
              key={row.label}
              className="flex justify-between items-center px-4 py-3.5"
              style={{
                borderBottom:
                  i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              <span
                className="text-[12px] font-extrabold uppercase tracking-wide"
                style={{ color: "var(--color-muted)" }}
              >
                {row.label}
              </span>
              <span
                className="text-[14px] font-extrabold"
                style={{ color: "var(--color-foreground)" }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "vacunas" && (
        <PetVaccinesTab petId={petId} vaccines={vaccines} />
      )}

      {tab === "citas" && <CitasTab appts={appts} />}
    </>
  );
}

function CitasTab({ appts }: { appts: ApptItem[] }) {
  if (appts.length === 0) {
    return (
      <div
        className="rounded-[18px] py-12 px-6 text-center"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p className="text-[36px] mb-2">📅</p>
        <p
          className="text-[14px] font-bold"
          style={{ color: "var(--color-foreground)" }}
        >
          Aún no hay citas
        </p>
        <p
          className="text-[12px] font-semibold mt-1"
          style={{ color: "var(--color-muted)" }}
        >
          Cuando agendes una visita aparecerá aquí.
        </p>
      </div>
    );
  }

  const now = Date.now();
  const upcoming = appts.filter(
    (a) => a.status === "SCHEDULED" && a.timestamp >= now
  );
  const past = appts.filter(
    (a) => a.status !== "SCHEDULED" || a.timestamp < now
  );

  const renderRow = (a: ApptItem) => {
    const badge = APPT_BADGE[a.status] || APPT_BADGE.SCHEDULED;
    return (
      <Link
        key={a.id}
        href={`/cita/${a.id}`}
        className="block rounded-[16px] p-4 hover:brightness-[1.02] transition"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap"
            style={{
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
            }}
          >
            {badge.label}
          </span>
          <span
            className="text-[12px] font-semibold"
            style={{ color: "var(--color-muted)" }}
          >
            {a.date}
          </span>
        </div>
        <p
          className="text-[14px] font-extrabold mb-1"
          style={{ color: "var(--color-foreground)" }}
        >
          {a.type}
        </p>
        {a.notes && (
          <p
            className="text-[13px] font-semibold leading-snug line-clamp-2"
            style={{ color: "var(--color-muted)" }}
          >
            {a.notes}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <div
            className="rounded-full overflow-hidden flex items-center justify-center text-white text-[10px] font-extrabold shrink-0"
            style={{
              width: 22,
              height: 22,
              background: a.vetPhotoUrl
                ? "var(--color-surface-2, var(--color-surface))"
                : "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 60%, oklch(45% 0.12 38)))",
              border: "1px solid var(--color-border)",
            }}
          >
            {a.vetPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.vetPhotoUrl}
                alt={a.vet}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>
                {a.vet.replace(/^Dr[a]?\.\s*/i, "").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <p
            className="text-[11px] font-semibold"
            style={{ color: "var(--color-muted)" }}
          >
            {a.vet}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3
            className="text-[11px] font-extrabold uppercase tracking-wide px-1"
            style={{ color: "var(--color-muted)" }}
          >
            Próximas · {upcoming.length}
          </h3>
          {upcoming.map(renderRow)}
        </section>
      )}
      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3
            className="text-[11px] font-extrabold uppercase tracking-wide px-1"
            style={{ color: "var(--color-muted)" }}
          >
            Anteriores · {past.length}
          </h3>
          {past.map(renderRow)}
        </section>
      )}
    </div>
  );
}
