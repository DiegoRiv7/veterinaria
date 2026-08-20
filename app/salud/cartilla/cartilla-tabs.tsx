"use client";
import { useState } from "react";
import { PetVaccinesTab, type VaccineEntry } from "@/components/PetVaccinesTab";
import {
  PetDewormingsTab,
  type DewormingEntry,
} from "@/components/PetDewormingsTab";
import {
  PetSurgeriesTab,
  type SurgeryEntry,
} from "@/components/PetSurgeriesTab";
import { PetRecordsTab, type RecordEntry } from "@/components/PetRecordsTab";
import {
  LAB_FIELDS,
  TEST_FIELDS,
  IMAGING_FIELDS,
  FEEDING_FIELDS,
} from "@/lib/cartilla-sections";
import {
  addLabStudyAction,
  deleteLabStudyAction,
  addDiagnosticTestAction,
  deleteDiagnosticTestAction,
  addImagingStudyAction,
  deleteImagingStudyAction,
  addFeedingRecordAction,
  deleteFeedingRecordAction,
} from "@/app/actions/health-records";

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
  vaccines: VaccineEntry[];
  dewormings: DewormingEntry[];
  surgeries: SurgeryEntry[];
  labStudies: RecordEntry[];
  diagnosticTests: RecordEntry[];
  imagingStudies: RecordEntry[];
  feedingRecords: RecordEntry[];
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

type SectionId =
  | "vaccines"
  | "deworm"
  | "surgeries"
  | "lab"
  | "tests"
  | "imaging"
  | "feeding"
  | "consults"
  | "vet";

const TABS: { id: SectionId; icon: string; label: string }[] = [
  { id: "vaccines", icon: "💉", label: "Vacunas" },
  { id: "deworm", icon: "💊", label: "Desparas." },
  { id: "surgeries", icon: "🔪", label: "Cirugías" },
  { id: "lab", icon: "🔬", label: "Lab" },
  { id: "tests", icon: "🧪", label: "Tests" },
  { id: "imaging", icon: "🩻", label: "Imagen" },
  { id: "feeding", icon: "🍖", label: "Alimento" },
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
        className="no-scrollbar flex px-3 py-3 overflow-x-auto"
        style={{ borderBottom: "1px solid oklch(28% 0.04 35)" }}
      >
        <div className="mx-auto flex gap-2">
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
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col gap-3"
      >
        {section === "vaccines" && <VaccinesSection payload={payload} />}
        {section === "deworm" && <DewormSection payload={payload} />}
        {section === "surgeries" && <SurgeriesSection payload={payload} />}
        {section === "lab" && (
          <PetRecordsTab
            petId={payload.pet.id}
            entries={payload.labStudies}
            fields={LAB_FIELDS}
            emoji="🔬"
            addLabel="Agregar estudio de laboratorio"
            formTitle="Nuevo estudio de laboratorio"
            emptyTitle="Sin estudios de laboratorio"
            emptyHint={`Registra los estudios de laboratorio de ${payload.pet.name}.`}
            successMessage="Estudio registrado."
            addAction={addLabStudyAction}
            deleteAction={deleteLabStudyAction}
            dark
            accent={payload.palette.accent}
          />
        )}
        {section === "tests" && (
          <PetRecordsTab
            petId={payload.pet.id}
            entries={payload.diagnosticTests}
            fields={TEST_FIELDS}
            emoji="🧪"
            addLabel="Agregar test"
            formTitle="Nuevo test de diagnóstico"
            emptyTitle="Sin tests registrados"
            emptyHint={`Registra los tests de diagnóstico de ${payload.pet.name}.`}
            successMessage="Test registrado."
            addAction={addDiagnosticTestAction}
            deleteAction={deleteDiagnosticTestAction}
            dark
            accent={payload.palette.accent}
          />
        )}
        {section === "imaging" && (
          <PetRecordsTab
            petId={payload.pet.id}
            entries={payload.imagingStudies}
            fields={IMAGING_FIELDS}
            emoji="🩻"
            addLabel="Agregar estudio de imagenología"
            formTitle="Nuevo estudio de imagenología"
            emptyTitle="Sin estudios de imagenología"
            emptyHint={`Registra radiografías y ultrasonidos de ${payload.pet.name}.`}
            successMessage="Estudio registrado."
            addAction={addImagingStudyAction}
            deleteAction={deleteImagingStudyAction}
            dark
            accent={payload.palette.accent}
          />
        )}
        {section === "feeding" && (
          <PetRecordsTab
            petId={payload.pet.id}
            entries={payload.feedingRecords}
            fields={FEEDING_FIELDS}
            emoji="🍖"
            addLabel="Registrar alimentación"
            formTitle="Registro de alimentación"
            emptyTitle="Sin registros de alimentación"
            emptyHint={`Registra qué come ${payload.pet.name} y cuánto al día.`}
            successMessage="Alimentación registrada."
            addAction={addFeedingRecordAction}
            deleteAction={deleteFeedingRecordAction}
            dark
            accent={payload.palette.accent}
          />
        )}
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

/* ─── Vaccines (editable) ──────────────────────────────────── */
function VaccinesSection({ payload }: { payload: CartillaPayload }) {
  return (
    <PetVaccinesTab
      petId={payload.pet.id}
      vaccines={payload.vaccines}
      dark
      accent={payload.palette.accent}
    />
  );
}

/* ─── Dewormings (editable) ────────────────────────────────── */
function DewormSection({ payload }: { payload: CartillaPayload }) {
  return (
    <PetDewormingsTab
      petId={payload.pet.id}
      items={payload.dewormings}
      dark
      accent={payload.palette.accent}
    />
  );
}

/* ─── Surgeries (editable) ─────────────────────────────────── */
function SurgeriesSection({ payload }: { payload: CartillaPayload }) {
  return (
    <PetSurgeriesTab
      petId={payload.pet.id}
      items={payload.surgeries}
      dark
      accent={payload.palette.accent}
    />
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
