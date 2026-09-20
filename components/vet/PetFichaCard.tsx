"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Eye, Loader2, Pencil, RotateCcw, X } from "lucide-react";
import { SPECIES_LABEL, SEX_LABEL, ageFromBirthDate } from "@/lib/utils";
import { FancySelect, VET_TOKENS } from "@/components/FancySelect";
import {
  updatePetFieldAction,
  revertPetFieldChangeAction,
} from "@/app/actions/patients";

/**
 * Ficha del paciente editable con clic:
 * - Clic en un valor → editor inline con Guardar / Cancelar.
 * - Cada cambio queda en bitácora (quién, qué, cuándo); el ojo del
 *   encabezado (visible solo si hay cambios) abre el historial, con
 *   opción de revertir cada cambio.
 */

type PetForFicha = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: Date | null;
  weightKg: number | null;
  sex: string;
  color: string | null;
  sterilized: boolean;
  microchipId: string | null;
};

export type FichaChange = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedByName: string;
  createdAt: string; // ISO
  reverted: boolean;
};

const FIELD_LABEL: Record<string, string> = {
  birthDate: "Fecha de nacimiento",
  species: "Especie",
  breed: "Raza",
  weightKg: "Peso",
  sex: "Género",
  color: "Color",
  sterilized: "Esterilizado/a",
  microchipId: "Microchip",
};

const SPECIES_OPTIONS = [
  { value: "DOG", label: "Perro" },
  { value: "CAT", label: "Gato" },
  { value: "BIRD", label: "Ave" },
  { value: "RABBIT", label: "Conejo" },
  { value: "HAMSTER", label: "Hámster" },
  { value: "REPTILE", label: "Reptil" },
  { value: "OTHER", label: "Otro" },
];
const SEX_OPTIONS = [
  { value: "MALE", label: "Macho" },
  { value: "FEMALE", label: "Hembra" },
  { value: "UNKNOWN", label: "Sin especificar" },
];
const BOOL_OPTIONS = [
  { value: "true", label: "Sí" },
  { value: "false", label: "No" },
];

type Editor =
  | { kind: "text"; placeholder?: string }
  | { kind: "number"; suffix?: string }
  | { kind: "date" }
  | { kind: "select"; options: { value: string; label: string }[] };

type Row = {
  field?: string; // ausente → fila no editable (Edad, Pasaporte)
  label: string;
  value: string; // valor mostrado
  raw?: string; // valor serializado para el editor
  editor?: Editor;
  href?: string;
};

function formatLong(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function dateInputValue(d: Date | null): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Presenta un valor serializado de la bitácora en formato humano. */
function displayLogValue(field: string, v: string | null): string {
  if (v === null || v === "") return "—";
  switch (field) {
    case "species":
      return SPECIES_LABEL[v] ?? v;
    case "sex":
      return SEX_LABEL[v] ?? v;
    case "sterilized":
      return v === "true" ? "Sí" : "No";
    case "weightKg":
      return `${v} kg`;
    case "birthDate": {
      const d = new Date(`${v}T12:00:00`);
      return Number.isNaN(d.getTime()) ? v : formatLong(d);
    }
    default:
      return v;
  }
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));
}

export function PetFichaCard({
  pet,
  cartillaHref,
  pasaporteHref,
  changes = [],
}: {
  pet: PetForFicha;
  cartillaHref: string;
  pasaporteHref?: string;
  changes?: FichaChange[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);

  const age = ageFromBirthDate(pet.birthDate) ?? "—";

  const rows: Row[] = [
    {
      field: "birthDate",
      label: "Fecha de nacimiento",
      value: formatLong(pet.birthDate),
      raw: dateInputValue(pet.birthDate),
      editor: { kind: "date" },
    },
    { label: "Edad", value: age },
    {
      field: "species",
      label: "Especie",
      value: SPECIES_LABEL[pet.species] ?? pet.species,
      raw: pet.species,
      editor: { kind: "select", options: SPECIES_OPTIONS },
    },
    {
      field: "breed",
      label: "Raza",
      value: pet.breed?.trim() || "—",
      raw: pet.breed ?? "",
      editor: { kind: "text", placeholder: "Ej. Labrador" },
    },
    {
      field: "weightKg",
      label: "Peso",
      value: pet.weightKg ? `${pet.weightKg} kg` : "—",
      raw: pet.weightKg != null ? String(pet.weightKg) : "",
      editor: { kind: "number", suffix: "kg" },
    },
    {
      field: "sex",
      label: "Género",
      value: SEX_LABEL[pet.sex] ?? "—",
      raw: pet.sex,
      editor: { kind: "select", options: SEX_OPTIONS },
    },
    {
      field: "color",
      label: "Color",
      value: pet.color?.trim() || "—",
      raw: pet.color ?? "",
      editor: { kind: "text", placeholder: "Ej. Café con blanco" },
    },
    {
      field: "sterilized",
      label: "Esterilizado/a",
      value: pet.sterilized ? "Sí ✓" : "No",
      raw: pet.sterilized ? "true" : "false",
      editor: { kind: "select", options: BOOL_OPTIONS },
    },
    {
      field: "microchipId",
      label: "Microchip",
      value: pet.microchipId?.trim() || "—",
      raw: pet.microchipId ?? "",
      editor: { kind: "text", placeholder: "Número de microchip" },
    },
    ...(pasaporteHref
      ? [{ label: "Pasaporte", value: "Ver pasaporte →", href: pasaporteHref }]
      : []),
  ];

  function startEdit(row: Row) {
    if (!row.field || saving) return;
    setEditing(row.field);
    setDraft(row.raw ?? "");
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }

  async function saveEdit(row: Row) {
    if (!row.field || saving) return;
    setSaving(true);
    const res = await updatePetFieldAction({
      petId: pet.id,
      field: row.field,
      value: draft,
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`${row.label} actualizado.`);
      setEditing(null);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function revertChange(c: FichaChange) {
    if (reverting) return;
    setReverting(c.id);
    const res = await revertPetFieldChangeAction(c.id);
    setReverting(null);
    if (res.ok) {
      toast.success(`${FIELD_LABEL[c.field] ?? c.field} revertido.`);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  function renderEditor(row: Row) {
    const ed = row.editor!;
    const inputClass =
      "h-9 rounded-[10px] border px-2.5 text-[13px] font-bold outline-none transition focus:border-[color:var(--vet-green)]";
    const inputStyle = {
      background: "var(--vet-bg-mid)",
      borderColor: "var(--vet-border)",
      color: "var(--vet-text-1)",
    } as const;
    return (
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        {ed.kind === "select" ? (
          <FancySelect
            value={draft}
            onChange={setDraft}
            required
            options={ed.options}
            height={36}
            fontSize={13}
            radius={10}
            accent="var(--vet-green)"
            tokens={VET_TOKENS}
            className="w-[180px]"
          />
        ) : ed.kind === "date" ? (
          <input
            type="date"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        ) : (
          <div className="relative">
            <input
              type={ed.kind === "number" ? "number" : "text"}
              inputMode={ed.kind === "number" ? "decimal" : undefined}
              step={ed.kind === "number" ? "0.1" : undefined}
              min={ed.kind === "number" ? "0" : undefined}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit(row);
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder={ed.kind === "text" ? ed.placeholder : undefined}
              className={`${inputClass} w-[180px] ${ed.kind === "number" ? "pr-8" : ""}`}
              style={inputStyle}
            />
            {ed.kind === "number" && ed.suffix && (
              <span
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold"
                style={{ color: "var(--vet-text-3)" }}
              >
                {ed.suffix}
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => saveEdit(row)}
          disabled={saving}
          aria-label="Guardar"
          title="Guardar"
          className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white transition hover:brightness-105 disabled:opacity-60 shrink-0"
          style={{ background: "var(--vet-green)" }}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-4 w-4" strokeWidth={3} />
          )}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={saving}
          aria-label="Cancelar"
          title="Cancelar"
          className="w-8 h-8 rounded-[9px] border flex items-center justify-center transition hover:brightness-95 disabled:opacity-60 shrink-0"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-3)",
          }}
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
    );
  }

  return (
    <section
      className="border overflow-hidden"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        borderRadius: 22,
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b"
        style={{ borderBottomColor: "var(--vet-border)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[20px]">🪪</span>
          <h2
            className="text-[15px] font-black truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            Ficha de {pet.name}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {changes.length > 0 && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Historial de cambios de la ficha"
              title="Historial de cambios"
              className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition hover:brightness-95"
              style={{
                background: "var(--vet-bg-mid)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-2)",
              }}
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <Link
            href={cartillaHref}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-[10px] text-[12px] font-extrabold text-white no-underline transition-all hover:brightness-105"
            style={{
              background:
                "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
              boxShadow: "0 4px 12px var(--vet-green-glow)",
            }}
          >
            📋 Ver expediente →
          </Link>
        </div>
      </div>

      {/* On desktop the rows split into two columns (label/value side-by-side
          in each column). On mobile we collapse to a single column list. */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {rows.map((r, i) => {
          const onLeftColumn = i % 2 === 0;
          const isLastLeft = onLeftColumn && i >= rows.length - 2;
          const isLastRight = !onLeftColumn && i === rows.length - 1;
          const isEditing = r.field != null && editing === r.field;
          return (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3 min-h-[54px]"
              style={{
                borderBottom:
                  isLastLeft || isLastRight
                    ? "none"
                    : "1px solid color-mix(in oklab, var(--vet-border) 65%, transparent)",
                borderRight: onLeftColumn
                  ? "1px solid color-mix(in oklab, var(--vet-border) 65%, transparent)"
                  : "none",
              }}
            >
              <span
                className="text-[12px] font-bold uppercase tracking-wider shrink-0"
                style={{ color: "var(--vet-text-3)" }}
              >
                {r.label}
              </span>
              {isEditing ? (
                renderEditor(r)
              ) : r.href ? (
                <Link
                  href={r.href}
                  className="text-[14px] font-extrabold text-right no-underline transition hover:brightness-110"
                  style={{ color: "var(--vet-green)" }}
                >
                  {r.value}
                </Link>
              ) : r.field ? (
                <button
                  type="button"
                  onClick={() => startEdit(r)}
                  title={`Editar ${r.label.toLowerCase()}`}
                  className="group inline-flex items-center gap-1.5 text-[14px] font-extrabold text-right truncate cursor-pointer transition hover:opacity-80"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  <Pencil
                    className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--vet-text-3)" }}
                  />
                  {r.value}
                </button>
              ) : (
                <span
                  className="text-[14px] font-extrabold text-right truncate"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  {r.value}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Historial de cambios */}
      {historyOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            className="vet-portal fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
            style={{ background: "rgba(30, 18, 10, 0.45)", backdropFilter: "blur(3px)" }}
            onClick={() => setHistoryOpen(false)}
          >
            <div
              className="w-full max-w-[560px] max-h-[85dvh] overflow-y-auto rounded-[20px] border"
              style={{
                background: "var(--vet-bg-mid)",
                borderColor: "var(--vet-border)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.30)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between gap-3 px-5 py-4 border-b sticky top-0 z-10"
                style={{
                  background: "var(--vet-bg-mid)",
                  borderBottomColor: "var(--vet-border)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" style={{ color: "var(--vet-green)" }} />
                  <h3 className="text-[15px] font-black" style={{ color: "var(--vet-text-1)" }}>
                    Historial de cambios de la ficha
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => setHistoryOpen(false)}
                  className="w-8 h-8 rounded-[9px] border flex items-center justify-center transition hover:brightness-95"
                  style={{
                    background: "var(--vet-bg-card)",
                    borderColor: "var(--vet-border)",
                    color: "var(--vet-text-3)",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 p-4">
                {changes.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-[14px] border px-4 py-3"
                    style={{
                      background: "var(--vet-bg-card)",
                      borderColor: "var(--vet-border)",
                      opacity: c.reverted ? 0.65 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className="text-[13px] font-extrabold"
                        style={{ color: "var(--vet-text-1)" }}
                      >
                        {FIELD_LABEL[c.field] ?? c.field}
                      </span>
                      <div className="flex items-center gap-2">
                        {c.reverted ? (
                          <span
                            className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full"
                            style={{
                              background: "var(--vet-bg-hover)",
                              color: "var(--vet-text-3)",
                            }}
                          >
                            Revertido
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => revertChange(c)}
                            disabled={!!reverting}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-[11px] font-extrabold transition hover:brightness-95 disabled:opacity-60"
                            style={{
                              background: "var(--vet-bg-mid)",
                              borderColor: "var(--vet-border)",
                              color: "var(--vet-text-2)",
                            }}
                          >
                            {reverting === c.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            Revertir
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[13px] font-bold mt-1.5" style={{ color: "var(--vet-text-2)" }}>
                      <span style={{ color: "var(--vet-text-3)", textDecoration: "line-through" }}>
                        {displayLogValue(c.field, c.oldValue)}
                      </span>
                      <span className="mx-1.5" style={{ color: "var(--vet-text-3)" }}>→</span>
                      <span style={{ color: "var(--vet-green-dim)" }}>
                        {displayLogValue(c.field, c.newValue)}
                      </span>
                    </div>
                    <div
                      className="text-[11.5px] font-semibold mt-1"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      {c.changedByName} · {formatWhen(c.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
