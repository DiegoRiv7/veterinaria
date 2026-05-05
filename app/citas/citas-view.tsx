"use client";
import { useState } from "react";
import Link from "next/link";
import { SPECIES_EMOJI, formatTime } from "@/lib/utils";

type ApptCard = {
  id: string;
  petName: string;
  species: string;
  serviceName: string;
  vetName: string;
  scheduledAt: string;
  status: string;
};

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  SCHEDULED: {
    label: "Confirmada",
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

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, today)) return "Hoy";
  if (same(d, tomorrow)) return "Mañana";
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function ClientCitasView({
  proximas,
  historial,
}: {
  proximas: ApptCard[];
  historial: ApptCard[];
}) {
  const [tab, setTab] = useState<"proximas" | "historial">("proximas");
  const list = tab === "proximas" ? proximas : historial;

  return (
    <>
      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-[14px] mb-4"
        style={{
          background: "var(--color-surface-2, var(--color-surface))",
        }}
      >
        {(
          [
            { id: "proximas" as const, label: "Próximas", count: proximas.length },
            { id: "historial" as const, label: "Historial", count: historial.length },
          ]
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 rounded-[10px] text-[14px] transition-all"
              style={{
                background: active ? "var(--color-surface)" : "transparent",
                color: active ? "var(--color-foreground)" : "var(--color-muted)",
                fontWeight: active ? 800 : 600,
                boxShadow: active ? "0 1px 4px var(--color-border)" : "none",
              }}
            >
              {t.label}
              <span className="ml-1.5 opacity-60 text-[12px]">{t.count}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div
          className="rounded-[20px] py-16 px-6 text-center"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-[42px] mb-3">📅</p>
          <p className="text-[15px] font-bold mb-1" style={{ color: "var(--color-foreground)" }}>
            {tab === "proximas" ? "No tienes citas próximas" : "Aún no hay historial"}
          </p>
          <p className="text-[13px] font-semibold" style={{ color: "var(--color-muted)" }}>
            {tab === "proximas"
              ? "Agenda tu próxima visita cuando quieras."
              : "Tus citas pasadas aparecerán aquí."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((a) => {
            const badge = STATUS_BADGE[a.status] || STATUS_BADGE.SCHEDULED;
            return (
              <Link key={a.id} href={`/cita/${a.id}`} className="block">
                <div
                  className="rounded-[18px] p-4 hover:brightness-[1.02] transition"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p
                        className="text-[15px] font-black truncate"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {a.serviceName}
                      </p>
                      <p
                        className="text-[12px] font-semibold mt-0.5 truncate"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {SPECIES_EMOJI[a.species] || "🐾"} {a.petName} ·{" "}
                        {a.vetName.split(" ")[0]}
                      </p>
                    </div>
                    <span
                      className="px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap shrink-0"
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-extrabold"
                    style={{
                      background: "var(--color-surface-2, var(--color-surface))",
                      color: "var(--color-foreground)",
                    }}
                  >
                    <span>📅</span>
                    <span style={{ color: "var(--color-muted)" }}>{dateLabel(a.scheduledAt)}</span>
                    <span style={{ color: "var(--color-muted)" }}>·</span>
                    <span
                      style={{
                        color: "var(--color-brand)",
                        fontFamily: "var(--font-space-grotesk), sans-serif",
                      }}
                    >
                      {formatTime(new Date(a.scheduledAt))}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
