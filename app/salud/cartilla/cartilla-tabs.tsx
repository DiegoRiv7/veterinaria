"use client";
import { useState } from "react";

export type CartillaPayload = {
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string;
    age: string;
    photoUrl: string | null;
    emoji: string;
  };
  palette: {
    from: string;
    to: string;
    accent: string;
  };
  vaccines: {
    id: string;
    name: string;
    applied: string;
    next: string;
    notes: string | null;
    status: "al día" | "próxima" | "vencida" | "—";
    progress: number;
  }[];
  dewormings: {
    id: string;
    name: string;
    date: string;
    vet: string;
    notes: string;
  }[];
  surgeries: {
    id: string;
    name: string;
    date: string;
    vet: string;
    notes: string;
  }[];
  consults: {
    id: string;
    type: string;
    date: string;
    vet: string;
    notes: string;
  }[];
  myVet: {
    name: string;
    photoUrl: string | null;
    email: string | null;
    clinic: string;
  } | null;
};

type SectionId = "vaccines" | "deworm" | "surgeries" | "consults" | "vet";

const TABS: { id: SectionId; icon: string; label: string }[] = [
  { id: "vaccines", icon: "💉", label: "Vacunas" },
  { id: "deworm", icon: "💊", label: "Desparas." },
  { id: "surgeries", icon: "🔪", label: "Cirugías" },
  { id: "consults", icon: "📋", label: "Consultas" },
  { id: "vet", icon: "🏥", label: "Mi Vet" },
];

// Dark theme tokens — warm-tinted to stay on Vetsfriend brand
const DK = {
  card: "oklch(24% 0.05 35)",
  cardLight: "oklch(28% 0.05 35)",
  border: "oklch(34% 0.05 35)",
  text: "oklch(96% 0.02 60)",
  textDim: "oklch(78% 0.04 60)",
  textMuted: "oklch(58% 0.04 60)",
  greenBg: "oklch(35% 0.15 145 / 0.28)",
  greenBorder: "oklch(45% 0.16 145 / 0.5)",
  greenText: "oklch(76% 0.18 145)",
  amberBg: "oklch(35% 0.15 60 / 0.28)",
  amberBorder: "oklch(45% 0.16 60 / 0.5)",
  amberText: "oklch(76% 0.18 60)",
  redBg: "oklch(35% 0.15 25 / 0.28)",
  redBorder: "oklch(45% 0.16 25 / 0.5)",
  redText: "oklch(76% 0.18 25)",
};

export function CartillaTabs({ payload }: { payload: CartillaPayload }) {
  const [section, setSection] = useState<SectionId>("vaccines");
  const accent = payload.palette.accent;

  return (
    <>
      {/* Tabs row */}
      <div
        className="flex gap-2 px-3 py-3 overflow-x-auto"
        style={{ borderBottom: "1px solid oklch(28% 0.04 35)" }}
      >
        {TABS.map((t) => {
          const active = section === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSection(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-all shrink-0"
              style={{
                background: active ? accent : DK.card,
                border: `1px solid ${active ? accent : DK.border}`,
                color: active ? "white" : DK.textDim,
                fontWeight: active ? 800 : 600,
              }}
            >
              <span className="text-[14px]">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col gap-3"
      >
        {section === "vaccines" && <VaccinesSection payload={payload} />}
        {section === "deworm" && <DewormSection payload={payload} />}
        {section === "surgeries" && <SurgeriesSection payload={payload} />}
        {section === "consults" && <ConsultsSection payload={payload} />}
        {section === "vet" && <VetSection payload={payload} />}
      </div>
    </>
  );
}

function DkCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[18px] p-4 lg:p-5"
      style={{
        background: DK.card,
        border: `1px solid ${DK.border}`,
      }}
    >
      {children}
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: "al día" | "próxima" | "vencida" | "—";
}) {
  const map = {
    "al día": {
      label: "Al día ✓",
      bg: DK.greenBg,
      border: DK.greenBorder,
      color: DK.greenText,
    },
    próxima: {
      label: "Próxima ⚠️",
      bg: DK.amberBg,
      border: DK.amberBorder,
      color: DK.amberText,
    },
    vencida: {
      label: "Vencida",
      bg: DK.redBg,
      border: DK.redBorder,
      color: DK.redText,
    },
    "—": {
      label: "—",
      bg: DK.cardLight,
      border: DK.border,
      color: DK.textMuted,
    },
  } as const;
  const s = map[status];
  return (
    <span
      className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function Field({
  label,
  value,
  hi,
  accent,
}: {
  label: string;
  value: string;
  hi?: boolean;
  accent: string;
}) {
  return (
    <div>
      <p
        className="text-[9px] font-extrabold tracking-[1px] mb-1"
        style={{ color: DK.textMuted }}
      >
        {label}
      </p>
      <p
        className="text-[12px] font-extrabold"
        style={{
          color: hi ? accent : DK.text,
          fontFamily: "var(--font-space-grotesk), sans-serif",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div
      className="rounded-[18px] p-8 text-center"
      style={{
        background: DK.card,
        border: `1px dashed ${DK.border}`,
      }}
    >
      <div className="text-[40px] mb-2">{icon}</div>
      <p className="text-[13px] font-bold" style={{ color: DK.text }}>
        {message}
      </p>
    </div>
  );
}

/* ─── Vaccines ─────────────────────────────────────────────── */
function VaccinesSection({ payload }: { payload: CartillaPayload }) {
  if (payload.vaccines.length === 0) {
    return (
      <EmptyState
        icon="💉"
        message={`Aún no hay vacunas registradas para ${payload.pet.name}.`}
      />
    );
  }
  return (
    <>
      {payload.vaccines.map((v) => (
        <DkCard key={v.id}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <p
              className="text-[15px] font-black"
              style={{ color: DK.text }}
            >
              {v.name}
            </p>
            <StatusPill status={v.status} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field
              label="APLICADA"
              value={v.applied}
              accent={payload.palette.accent}
            />
            <Field
              label="PRÓXIMA"
              value={v.next}
              hi
              accent={payload.palette.accent}
            />
          </div>
          <div
            className="h-[3px] rounded-full overflow-hidden"
            style={{ background: DK.border }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${v.progress}%`,
                background:
                  v.status === "vencida"
                    ? DK.redText
                    : v.status === "próxima"
                    ? DK.amberText
                    : `linear-gradient(90deg, ${payload.palette.from}, ${payload.palette.accent})`,
              }}
            />
          </div>
          {v.notes && (
            <p
              className="text-[12px] font-semibold leading-snug mt-3"
              style={{ color: DK.textDim }}
            >
              {v.notes}
            </p>
          )}
        </DkCard>
      ))}
    </>
  );
}

/* ─── Dewormings ───────────────────────────────────────────── */
function DewormSection({ payload }: { payload: CartillaPayload }) {
  if (payload.dewormings.length === 0) {
    return (
      <EmptyState
        icon="💊"
        message={`Aún no hay desparasitaciones registradas para ${payload.pet.name}.`}
      />
    );
  }
  return (
    <>
      {payload.dewormings.map((d) => (
        <DkCard key={d.id}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-[14px] font-black" style={{ color: DK.text }}>
              {d.name}
            </p>
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase"
              style={{
                background: `${payload.palette.accent}22`,
                border: `1px solid ${payload.palette.accent}55`,
                color: payload.palette.accent,
              }}
            >
              Aplicada
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field
              label="FECHA"
              value={d.date}
              accent={payload.palette.accent}
            />
            <Field
              label="VETERINARIO"
              value={d.vet}
              accent={payload.palette.accent}
            />
          </div>
          <div
            className="rounded-[10px] px-3 py-2.5"
            style={{ background: DK.cardLight }}
          >
            <p
              className="text-[9px] font-extrabold tracking-[0.5px] mb-1"
              style={{ color: DK.textMuted }}
            >
              NOTAS
            </p>
            <p
              className="text-[12px] font-semibold leading-snug"
              style={{ color: DK.textDim }}
            >
              {d.notes}
            </p>
          </div>
        </DkCard>
      ))}
    </>
  );
}

/* ─── Surgeries ────────────────────────────────────────────── */
function SurgeriesSection({ payload }: { payload: CartillaPayload }) {
  if (payload.surgeries.length === 0) {
    return (
      <EmptyState
        icon="🔪"
        message="Sin procedimientos registrados."
      />
    );
  }
  return (
    <>
      {payload.surgeries.map((s) => (
        <DkCard key={s.id}>
          <p
            className="text-[15px] font-black mb-3"
            style={{ color: DK.text }}
          >
            {s.name}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field
              label="FECHA"
              value={s.date}
              accent={payload.palette.accent}
            />
            <Field
              label="VETERINARIO"
              value={s.vet}
              accent={payload.palette.accent}
            />
          </div>
          <div
            className="rounded-[10px] px-3 py-2.5"
            style={{ background: DK.cardLight }}
          >
            <p
              className="text-[9px] font-extrabold tracking-[0.5px] mb-1"
              style={{ color: DK.textMuted }}
            >
              NOTAS
            </p>
            <p
              className="text-[12px] font-semibold leading-snug"
              style={{ color: DK.textDim }}
            >
              {s.notes}
            </p>
          </div>
        </DkCard>
      ))}
    </>
  );
}

/* ─── Consults ─────────────────────────────────────────────── */
function ConsultsSection({ payload }: { payload: CartillaPayload }) {
  if (payload.consults.length === 0) {
    return (
      <EmptyState
        icon="📋"
        message={`Aún no hay consultas registradas para ${payload.pet.name}.`}
      />
    );
  }
  return (
    <>
      {payload.consults.map((c) => (
        <DkCard key={c.id}>
          <div className="flex gap-3 items-start">
            <div
              className="rounded-[12px] flex items-center justify-center text-[18px] shrink-0"
              style={{
                width: 38,
                height: 38,
                background: `${payload.palette.accent}22`,
              }}
            >
              📋
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p
                  className="text-[13px] font-extrabold"
                  style={{ color: DK.text }}
                >
                  {c.type}
                </p>
                <p
                  className="text-[11px] font-semibold"
                  style={{ color: DK.textMuted }}
                >
                  {c.date}
                </p>
              </div>
              <p
                className="text-[12px] font-semibold leading-snug"
                style={{ color: DK.textDim }}
              >
                {c.notes}
              </p>
              <p
                className="text-[11px] font-bold mt-1.5"
                style={{ color: payload.palette.accent }}
              >
                {c.vet}
              </p>
            </div>
          </div>
        </DkCard>
      ))}
    </>
  );
}

/* ─── My Vet ───────────────────────────────────────────────── */
function VetSection({ payload }: { payload: CartillaPayload }) {
  if (!payload.myVet) {
    return (
      <EmptyState
        icon="🏥"
        message={`Cuando ${payload.pet.name} tenga su primera cita verás aquí los datos del vet asignado.`}
      />
    );
  }
  const v = payload.myVet;
  return (
    <DkCard>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="rounded-[14px] overflow-hidden flex items-center justify-center text-[20px] shrink-0"
          style={{
            width: 48,
            height: 48,
            background: v.photoUrl
              ? "transparent"
              : `${payload.palette.accent}22`,
            border: `1px solid ${DK.border}`,
          }}
        >
          {v.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.photoUrl}
              alt={v.name}
              className="w-full h-full object-cover"
            />
          ) : (
            "🩺"
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-black" style={{ color: DK.text }}>
            {v.name}
          </p>
          <p className="text-[12px] font-semibold" style={{ color: DK.textDim }}>
            {v.clinic}
          </p>
        </div>
      </div>
      {v.email && (
        <div
          className="flex items-center gap-3 py-2.5"
          style={{ borderTop: `1px solid ${DK.border}` }}
        >
          <span className="text-[18px]">✉️</span>
          <div>
            <p
              className="text-[9px] font-extrabold tracking-[0.5px]"
              style={{ color: DK.textMuted }}
            >
              CORREO
            </p>
            <p className="text-[12px] font-bold" style={{ color: DK.text }}>
              {v.email}
            </p>
          </div>
        </div>
      )}
    </DkCard>
  );
}
