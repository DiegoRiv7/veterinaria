"use client";
import { useState } from "react";

type InfoRow = { label: string; value: string };
type Vaccine = {
  id: string;
  name: string;
  applied: string;
  next: string;
  status: "al día" | "próxima" | "vencida";
};
type HistoryItem = {
  id: string;
  type: string;
  date: string;
  vet: string;
  notes: string;
};

const STATUS_BADGE: Record<
  Vaccine["status"],
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
};

export function PetDetailTabs({
  info,
  vaccines,
  history,
}: {
  info: InfoRow[];
  vaccines: Vaccine[];
  history: HistoryItem[];
}) {
  const [tab, setTab] = useState<"info" | "vacunas" | "historial">("info");

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
            { id: "historial" as const, label: "Historial" },
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
        <div className="flex flex-col gap-3">
          {vaccines.length === 0 ? (
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
                Las vacunas aplicadas aparecerán aquí.
              </p>
            </div>
          ) : (
            vaccines.map((v) => {
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
                    <span
                      className="px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap shrink-0"
                      style={{
                        background: s.bg,
                        color: s.color,
                        border: `1px solid ${s.border}`,
                      }}
                    >
                      {v.status}
                    </span>
                  </div>
                  <div className="flex gap-5">
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
                        {v.applied}
                      </p>
                    </div>
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
                              : "#c0392b",
                        }}
                      >
                        {v.next}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "historial" && (
        <div className="flex flex-col gap-3">
          {history.length === 0 ? (
            <div
              className="rounded-[18px] py-12 px-6 text-center"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <p className="text-[36px] mb-2">📋</p>
              <p
                className="text-[14px] font-bold"
                style={{ color: "var(--color-foreground)" }}
              >
                Sin historial todavía
              </p>
              <p
                className="text-[12px] font-semibold mt-1"
                style={{ color: "var(--color-muted)" }}
              >
                Después de cada visita verás los detalles aquí.
              </p>
            </div>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className="rounded-[16px] p-4"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                    style={{
                      background:
                        "color-mix(in oklab, var(--color-brand) 12%, transparent)",
                      color: "var(--color-brand)",
                      border:
                        "1px solid color-mix(in oklab, var(--color-brand) 28%, transparent)",
                    }}
                  >
                    {h.type}
                  </span>
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {h.date}
                  </span>
                </div>
                <p
                  className="text-[13px] font-semibold leading-snug"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {h.notes}
                </p>
                <p
                  className="text-[11px] font-semibold mt-1.5"
                  style={{ color: "var(--color-muted)" }}
                >
                  {h.vet}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
