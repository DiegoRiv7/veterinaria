"use client";

import { useState } from "react";
import Link from "next/link";
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

type SectionId =
  | "vaccines"
  | "deworm"
  | "surgeries"
  | "lab"
  | "tests"
  | "imaging"
  | "feeding"
  | "consults";

const TABS: { id: SectionId; icon: string; label: string }[] = [
  { id: "vaccines", icon: "💉", label: "Vacunas" },
  { id: "deworm", icon: "💊", label: "Desparasitación" },
  { id: "surgeries", icon: "🔪", label: "Cirugías" },
  { id: "lab", icon: "🔬", label: "Laboratorio" },
  { id: "tests", icon: "🧪", label: "Tests" },
  { id: "imaging", icon: "🩻", label: "Imagenología" },
  { id: "feeding", icon: "🍖", label: "Alimentación" },
  { id: "consults", icon: "📋", label: "Consultas" },
];

export function VetCartillaTabs({
  petId,
  accent,
  vaccines,
  dewormings,
  surgeries,
  consults,
  labStudies,
  diagnosticTests,
  imagingStudies,
  feedingRecords,
}: {
  petId: string;
  accent: string;
  vaccines: VaccineEntry[];
  dewormings: DewormingEntry[];
  surgeries: SurgeryEntry[];
  consults: { id: string; type: string; date: string; vet: string; notes: string }[];
  labStudies: RecordEntry[];
  diagnosticTests: RecordEntry[];
  imagingStudies: RecordEntry[];
  feedingRecords: RecordEntry[];
}) {
  const [section, setSection] = useState<SectionId>("vaccines");

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div
        className="flex gap-2 p-2 rounded-[14px] border overflow-x-auto"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
        }}
      >
        {TABS.map((t) => {
          const active = section === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSection(t.id)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-[10px] text-[12px] font-extrabold transition-colors"
              style={{
                background: active
                  ? `color-mix(in oklab, ${accent} 14%, transparent)`
                  : "transparent",
                color: active ? accent : "var(--vet-text-2)",
                border: `1px solid ${
                  active
                    ? `color-mix(in oklab, ${accent} 30%, transparent)`
                    : "transparent"
                }`,
              }}
            >
              <span>{t.icon}</span>
              {t.label}
              <span
                className="vet-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
                style={{
                  background: active
                    ? `color-mix(in oklab, ${accent} 22%, transparent)`
                    : "var(--vet-bg-hover)",
                  color: active ? accent : "var(--vet-text-3)",
                }}
              >
                {t.id === "vaccines"
                  ? vaccines.length
                  : t.id === "deworm"
                  ? dewormings.length
                  : t.id === "surgeries"
                  ? surgeries.length
                  : t.id === "lab"
                  ? labStudies.length
                  : t.id === "tests"
                  ? diagnosticTests.length
                  : t.id === "imaging"
                  ? imagingStudies.length
                  : t.id === "feeding"
                  ? feedingRecords.length
                  : consults.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div
        className="border p-5 sm:p-6"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 18,
        }}
      >
        {section === "vaccines" && (
          <PetVaccinesTab petId={petId} vaccines={vaccines} />
        )}
        {section === "deworm" && (
          <PetDewormingsTab petId={petId} items={dewormings} />
        )}
        {section === "surgeries" && (
          <PetSurgeriesTab petId={petId} items={surgeries} />
        )}
        {section === "lab" && (
          <PetRecordsTab
            petId={petId}
            entries={labStudies}
            fields={LAB_FIELDS}
            emoji="🔬"
            addLabel="Agregar estudio de laboratorio"
            formTitle="Nuevo estudio de laboratorio"
            emptyTitle="Sin estudios de laboratorio"
            emptyHint="Registra químico sanguíneo, hemograma, coprológico y más."
            successMessage="Estudio registrado."
            addAction={addLabStudyAction}
            deleteAction={deleteLabStudyAction}
          />
        )}
        {section === "tests" && (
          <PetRecordsTab
            petId={petId}
            entries={diagnosticTests}
            fields={TEST_FIELDS}
            emoji="🧪"
            addLabel="Agregar test"
            formTitle="Nuevo test de diagnóstico"
            emptyTitle="Sin tests registrados"
            emptyHint="Registra tests de moquillo, FeLV, FIV y más, con su resultado."
            successMessage="Test registrado."
            addAction={addDiagnosticTestAction}
            deleteAction={deleteDiagnosticTestAction}
          />
        )}
        {section === "imaging" && (
          <PetRecordsTab
            petId={petId}
            entries={imagingStudies}
            fields={IMAGING_FIELDS}
            emoji="🩻"
            addLabel="Agregar estudio de imagenología"
            formTitle="Nuevo estudio de imagenología"
            emptyTitle="Sin estudios de imagenología"
            emptyHint="Registra radiografías, ultrasonidos y otros estudios con sus hallazgos."
            successMessage="Estudio registrado."
            addAction={addImagingStudyAction}
            deleteAction={deleteImagingStudyAction}
          />
        )}
        {section === "feeding" && (
          <PetRecordsTab
            petId={petId}
            entries={feedingRecords}
            fields={FEEDING_FIELDS}
            emoji="🍖"
            addLabel="Registrar alimentación"
            formTitle="Registro de alimentación"
            emptyTitle="Sin registros de alimentación"
            emptyHint="Registra el tipo de alimento, la cantidad diaria en gramos y el peso."
            successMessage="Alimentación registrada."
            addAction={addFeedingRecordAction}
            deleteAction={deleteFeedingRecordAction}
          />
        )}
        {section === "consults" &&
          (consults.length === 0 ? (
            <div
              className="py-14 text-center"
              style={{ color: "var(--vet-text-3)" }}
            >
              <div className="text-[36px] mb-2">📋</div>
              <div className="text-[14px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                Sin consultas registradas
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {consults.map((c) => (
                <Link
                  key={c.id}
                  href={`/vet/cita/${c.id}`}
                  className="block px-4 py-3 rounded-[12px] border transition-colors no-underline hover:[border-color:var(--vet-green)]"
                  style={{
                    background: "var(--vet-bg-mid)",
                    borderColor: "var(--vet-border)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p
                      className="text-[14px] font-extrabold"
                      style={{ color: "var(--vet-text-1)" }}
                    >
                      {c.type}
                    </p>
                    <p
                      className="text-[12px] font-semibold capitalize"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      {c.date}
                    </p>
                  </div>
                  <p
                    className="text-[12px] font-bold mt-0.5"
                    style={{ color: accent }}
                  >
                    {c.vet}
                  </p>
                  <p
                    className="text-[13px] font-semibold mt-1.5 leading-snug line-clamp-2"
                    style={{ color: "var(--vet-text-2)" }}
                  >
                    {c.notes}
                  </p>
                </Link>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
