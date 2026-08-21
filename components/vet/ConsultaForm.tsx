"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Check, ChevronLeft, ChevronRight, FileText, Loader2, RotateCcw } from "lucide-react";
import { FancySelect, VET_TOKENS } from "@/components/FancySelect";
import type {
  ConsultaData,
  ConsultaValue,
  FormField,
  FormSchema,
  FormSection,
} from "@/lib/form-schema";
import {
  addServiceSelectOptionAction,
  reopenAppointmentAction,
  saveConsultaDataAction,
} from "@/app/actions/appointments";

/**
 * Dynamic per-service consultation form. Renders the schema defined on
 * the Service (or DEFAULT_CONSULTA_SCHEMA when missing) and persists the
 * answers via `saveConsultaDataAction`.
 *
 * Behavior:
 * - Autosaves a "draft" 1200ms after the last change (markCompleted: false).
 * - "Marcar atendida" performs a final save with markCompleted: true.
 * - When `disabled` (e.g. CANCELLED) is true, the entire form is read-only
 *   and autosave is suppressed.
 * - When `completed` is true (cita ya cerrada), inputs are read-only;
 *   "Reabrir cita" vuelve el estado a SCHEDULED para corregir la consulta.
 */
export function ConsultaForm({
  schema,
  initial,
  appointmentId,
  disabled = false,
  completed = false,
  defaultDate,
}: {
  schema: FormSchema;
  initial: ConsultaData;
  appointmentId: string;
  disabled?: boolean;
  completed?: boolean;
  /** Fecha de la cita (YYYY-MM-DD) — default de las fechas obligatorias. */
  defaultDate?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // All field ids that should have an entry in state (skips visual-only
  // headings).
  const dataFieldIds = useMemo(
    () => collectDataFieldIds(schema),
    [schema]
  );

  // State is keyed by field id. Initialize once from `initial` so the
  // user's edits are not stomped on every render.
  const [values, setValues] = useState<ConsultaData>(() =>
    seedValues(dataFieldIds, schema, initial, defaultDate)
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  // Don't autosave while a "Marcar atendida" save is in flight.
  const suppressAutosave = useRef(false);

  const readOnly = disabled || completed;

  const persist = useCallback(
    async (data: ConsultaData, options: { markCompleted?: boolean } = {}) => {
      setSaving(true);
      try {
        const result = await saveConsultaDataAction(
          appointmentId,
          data,
          options
        );
        if (!result.ok) {
          toast.error("No pudimos guardar", { description: result.error });
          return false;
        }
        setSavedAt(Date.now());
        return true;
      } catch (e) {
        toast.error("No pudimos guardar", {
          description: e instanceof Error ? e.message : "Intenta de nuevo.",
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [appointmentId]
  );

  // Debounced autosave on value changes.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (readOnly) return;
    if (suppressAutosave.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        const ok = await persist(values);
        if (ok) router.refresh();
      });
    }, 1200);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [values, readOnly, persist, router]);

  function setFieldValue(id: string, value: ConsultaValue) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  async function handleOpenSummaryPdf() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const ok = await persist(values);
    if (ok) {
      window.open(`/api/receta/${appointmentId}`, "_blank", "noopener,noreferrer");
      router.refresh();
    }
  }

  const registerOption = useCallback(
    async (fieldId: string, name: string) => {
      const res = await addServiceSelectOptionAction(appointmentId, fieldId, name);
      if (!res.ok) {
        toast.error("No se pudo registrar", { description: res.error });
        return false;
      }
      toast.success(`"${name}" se agregó a la lista`);
      router.refresh();
      return true;
    },
    [appointmentId, router]
  );

  async function handleReopen() {
    if (reopening) return;
    setReopening(true);
    try {
      const res = await reopenAppointmentAction(appointmentId);
      if (res.ok) {
        toast.success("Cita reabierta", {
          description: "Ya puedes editar la consulta de nuevo.",
        });
        router.refresh();
      } else {
        toast.error("No se pudo reabrir", { description: res.error });
      }
    } finally {
      setReopening(false);
    }
  }

  async function handleMarkCompleted() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    suppressAutosave.current = true;
    setFinalizing(true);
    try {
      const ok = await persist(values, { markCompleted: true });
      if (ok) {
        toast.success("Cita marcada como atendida");
        router.refresh();
      }
    } finally {
      setFinalizing(false);
      // Re-enable autosave after a tick so the refresh-triggered state
      // doesn't immediately re-fire a save.
      setTimeout(() => {
        suppressAutosave.current = false;
      }, 200);
    }
  }

  const reopenButton = (
    <button
      type="button"
      onClick={handleReopen}
      disabled={reopening || saving}
      title="Volver a abrir la cita para editar la consulta"
      className="h-12 px-5 rounded-[14px] text-[14px] font-extrabold border transition hover:brightness-105 disabled:opacity-60 inline-flex items-center justify-center gap-2"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        color: "var(--vet-text-1)",
      }}
    >
      {reopening ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Reabriendo…
        </>
      ) : (
        <>
          <RotateCcw className="h-4 w-4" />
          Reabrir cita
        </>
      )}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      {schema.sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          values={values}
          onChange={setFieldValue}
          readOnly={readOnly}
          onRegisterOption={registerOption}
        />
      ))}

      {/* Footer actions */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-[20px]">
          <SaveIndicator saving={saving} savedAt={savedAt} disabled={readOnly} />
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {completed ? (
          <>
            <button
              type="button"
              onClick={handleOpenSummaryPdf}
              disabled={saving}
              className="h-12 px-5 rounded-[14px] text-[14px] font-extrabold border transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-1)",
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparando…
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generar receta
                </>
              )}
            </button>
            {reopenButton}
          </>
        ) : disabled ? (
          reopenButton
        ) : (
          <>
            <button
              type="button"
              onClick={handleOpenSummaryPdf}
              disabled={saving || finalizing}
              className="h-12 px-5 rounded-[14px] text-[14px] font-extrabold border transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-1)",
              }}
            >
              {saving && !finalizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparando…
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generar receta
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleMarkCompleted}
              disabled={saving || finalizing}
              className="h-12 px-5 rounded-[14px] text-[14px] font-extrabold text-white transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--vet-green-dim) 82%, black), var(--vet-green-dim))",
                boxShadow: "0 10px 24px var(--vet-green-glow)",
                color: "#fff",
              }}
            >
              {finalizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Marcar atendida
                </>
              )}
            </button>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function collectDataFieldIds(schema: FormSchema): string[] {
  const ids: string[] = [];
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === "heading") continue;
      ids.push(field.id);
    }
  }
  return ids;
}

function seedValues(
  ids: string[],
  schema: FormSchema,
  initial: ConsultaData,
  defaultDate?: string
): ConsultaData {
  const out: ConsultaData = {};
  // Build lookup of field by id
  const fieldById = new Map<string, FormField>();
  for (const section of schema.sections) {
    for (const field of section.fields) {
      fieldById.set(field.id, field);
    }
  }
  for (const id of ids) {
    const fromInitial = initial[id];
    if (fromInitial !== undefined && fromInitial !== null) {
      out[id] = fromInitial;
      continue;
    }
    const f = fieldById.get(id);
    if (f?.type === "checkbox") out[id] = false;
    else if (f?.type === "checkboxes") out[id] = [];
    else if (f?.type === "date" && f.required && defaultDate) {
      // Las fechas obligatorias ("Fecha de la cirugía", "Fecha del
      // estudio"…) arrancan con la fecha de la cita; se pueden cambiar.
      out[id] = defaultDate;
    } else out[id] = "";
  }
  return out;
}

/* ─── Save indicator ────────────────────────────────────────────── */

function SaveIndicator({
  saving,
  savedAt,
  disabled,
}: {
  saving: boolean;
  savedAt: number | null;
  disabled?: boolean;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    // Refresh the "hace X" string every 30s while shown.
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [savedAt]);

  if (disabled) return null;

  if (saving) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[12px] font-bold"
        style={{ color: "var(--vet-text-3)" }}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Guardando…
      </span>
    );
  }
  if (savedAt) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[12px] font-bold"
        style={{ color: "var(--vet-text-3)" }}
      >
        <Check className="h-3.5 w-3.5" style={{ color: "var(--vet-green)" }} />
        Guardado {formatAgo(savedAt)}
      </span>
    );
  }
  return null;
}

function formatAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "hace un momento";
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h}h`;
}

/* ─── Section + fields ──────────────────────────────────────────── */

function SectionBlock({
  section,
  values,
  onChange,
  readOnly,
  onRegisterOption,
}: {
  section: FormSection;
  values: ConsultaData;
  onChange: (id: string, v: ConsultaValue) => void;
  readOnly: boolean;
  onRegisterOption: (fieldId: string, name: string) => Promise<boolean>;
}) {
  return (
    <section
      className="rounded-[16px] border overflow-hidden"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        boxShadow: "var(--shadow-soft-sm)",
      }}
    >
      {section.title && (
        <header
          className="px-5 py-3 border-b"
          style={{
            borderColor: "var(--vet-border)",
            background: "var(--vet-bg-mid)",
          }}
        >
          <h3
            className="text-[12px] font-extrabold uppercase tracking-[0.08em]"
            style={{ color: "var(--vet-text-2)" }}
          >
            {section.title}
          </h3>
        </header>
      )}
      <div className="p-5 flex flex-col gap-5">
        {section.fields.length === 0 ? (
          <p
            className="text-[13px] italic"
            style={{ color: "var(--vet-text-3)" }}
          >
            Esta sección no tiene campos.
          </p>
        ) : (
          section.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(v) => onChange(field.id, v)}
              readOnly={readOnly}
              onRegisterOption={onRegisterOption}
            />
          ))
        )}
      </div>
    </section>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  readOnly,
  onRegisterOption,
}: {
  field: FormField;
  value: ConsultaValue | undefined;
  onChange: (v: ConsultaValue) => void;
  readOnly: boolean;
  onRegisterOption: (fieldId: string, name: string) => Promise<boolean>;
}) {
  if (field.type === "heading") {
    return (
      <h4
        className="text-[14px] font-extrabold mt-1"
        style={{ color: "var(--vet-text-1)" }}
      >
        {field.label}
      </h4>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel field={field} />
      <FieldControl
        field={field}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        onRegisterOption={onRegisterOption}
      />
      {field.helpText && (
        <p
          className="text-[12px] mt-0.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          {field.helpText}
        </p>
      )}
    </div>
  );
}

function FieldLabel({ field }: { field: FormField }) {
  return (
    <label
      htmlFor={`f-${field.id}`}
      className="text-[13px] font-extrabold"
      style={{ color: "var(--vet-text-1)" }}
    >
      {field.label}
      {field.required && (
        <span
          aria-hidden
          className="ml-1"
          style={{ color: "var(--vet-red)" }}
        >
          *
        </span>
      )}
    </label>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  readOnly,
  onRegisterOption,
}: {
  field: FormField;
  value: ConsultaValue | undefined;
  onChange: (v: ConsultaValue) => void;
  readOnly: boolean;
  onRegisterOption: (fieldId: string, name: string) => Promise<boolean>;
}) {
  const inputStyle: React.CSSProperties = {
    background: "var(--vet-bg-card)",
    borderColor: "var(--vet-border)",
    color: "var(--vet-text-1)",
  };

  const baseInputClass =
    "w-full rounded-[12px] border px-4 text-[15px] outline-none transition focus:border-[color:var(--vet-green)] focus:ring-2 focus:ring-[color:var(--vet-green-glow)] disabled:opacity-60 disabled:cursor-not-allowed";

  switch (field.type) {
    case "text":
      return (
        <input
          id={`f-${field.id}`}
          type="text"
          className={`h-12 ${baseInputClass}`}
          style={inputStyle}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      );

    case "textarea":
      return (
        <textarea
          id={`f-${field.id}`}
          rows={3}
          className={`${baseInputClass} py-3 leading-snug resize-none`}
          style={{
            ...inputStyle,
            // CSS field-sizing lets the textarea grow with content (Chromium
            // 123+, Safari 17.4+). Falls back to a 3-row min in older
            // browsers via the rows attribute.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fieldSizing: "content" as any,
            minHeight: "88px",
          }}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      );

    case "number": {
      const v =
        typeof value === "number"
          ? String(value)
          : typeof value === "string"
            ? value
            : "";
      return (
        <div className="relative">
          <input
            id={`f-${field.id}`}
            type="number"
            inputMode="decimal"
            className={`h-12 ${baseInputClass} ${field.unit ? "pr-14" : ""}`}
            style={inputStyle}
            value={v}
            placeholder={field.placeholder}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange("");
                return;
              }
              const num = Number(raw);
              onChange(Number.isFinite(num) ? num : raw);
            }}
            disabled={readOnly}
          />
          {field.unit && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold uppercase tracking-wider pointer-events-none"
              style={{ color: "var(--vet-text-3)" }}
            >
              {field.unit}
            </span>
          )}
        </div>
      );
    }

    case "date":
      return (
        <PrettyDatePicker
          id={`f-${field.id}`}
          value={typeof value === "string" ? value : ""}
          disabled={readOnly}
          onChange={onChange}
        />
      );

    case "select":
      return (
        <SelectWithOther
          field={field}
          value={typeof value === "string" ? value : ""}
          readOnly={readOnly}
          onChange={onChange}
          onRegisterOption={onRegisterOption}
        />
      );

    case "checkbox": {
      const checked = value === true;
      return (
        <label
          className="inline-flex items-center gap-3 cursor-pointer select-none w-fit"
          style={{ color: "var(--vet-text-1)" }}
        >
          <span
            className="inline-flex items-center justify-center rounded-[8px] border transition"
            style={{
              width: 24,
              height: 24,
              background: checked ? "var(--vet-green)" : "var(--vet-bg-card)",
              borderColor: checked ? "var(--vet-green)" : "var(--vet-border)",
            }}
          >
            {checked && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
          </span>
          <input
            id={`f-${field.id}`}
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
          />
          <span className="text-[14px] font-semibold">Sí</span>
        </label>
      );
    }

    case "checkboxes": {
      const selected: string[] = Array.isArray(value)
        ? (value as string[])
        : [];
      const options = field.options ?? [];
      return (
        <div className="flex flex-wrap gap-2">
          {options.length === 0 ? (
            <p
              className="text-[12px] italic"
              style={{ color: "var(--vet-text-3)" }}
            >
              Sin opciones configuradas.
            </p>
          ) : (
            options.map((opt) => {
              const active = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    if (active) {
                      onChange(selected.filter((s) => s !== opt));
                    } else {
                      onChange([...selected, opt]);
                    }
                  }}
                  className="px-3.5 py-2 rounded-full text-[12px] font-extrabold border transition disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: active
                      ? "color-mix(in oklab, var(--vet-green) 14%, var(--vet-bg-card))"
                      : "var(--vet-bg-card)",
                    borderColor: active
                      ? "color-mix(in oklab, var(--vet-green) 38%, var(--vet-border))"
                      : "var(--vet-border)",
                    color: active ? "var(--vet-green-dim)" : "var(--vet-text-2)",
                  }}
                >
                  {active ? "✓ " : ""}
                  {opt}
                </button>
              );
            })
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

/**
 * Select con salida "Otro": al elegirla aparece un campo para escribir el
 * nombre nuevo y guardarlo en el catálogo del servicio — así el doctor
 * puede registrar un biológico/producto que no estaba en la lista y queda
 * disponible para siempre.
 */
function SelectWithOther({
  field,
  value,
  readOnly,
  onChange,
  onRegisterOption,
}: {
  field: FormField;
  value: string;
  readOnly: boolean;
  onChange: (v: ConsultaValue) => void;
  onRegisterOption: (fieldId: string, name: string) => Promise<boolean>;
}) {
  const [custom, setCustom] = useState("");
  const [savingOption, setSavingOption] = useState(false);
  const options = field.options ?? [];
  const otherOpt =
    options.find((o) => /^otr[oa]s?\b/i.test(o.trim())) ?? null;
  const showCustom = otherOpt !== null && value === otherOpt && !readOnly;

  async function commit() {
    const name = custom.trim();
    if (!name || savingOption) return;
    setSavingOption(true);
    const ok = await onRegisterOption(field.id, name);
    setSavingOption(false);
    if (ok) {
      onChange(name);
      setCustom("");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <PrettySelect
        id={`f-${field.id}`}
        value={value}
        options={options}
        placeholder="Selecciona"
        disabled={readOnly}
        onChange={onChange}
      />
      {showCustom && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder="Escribe el nombre nuevo…"
            className="h-12 flex-1 rounded-[12px] border px-4 text-[15px] outline-none transition focus:border-[color:var(--vet-green)] focus:ring-2 focus:ring-[color:var(--vet-green-glow)]"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-1)",
            }}
          />
          <button
            type="button"
            onClick={commit}
            disabled={savingOption || !custom.trim()}
            className="h-12 px-4 rounded-[12px] text-[13px] font-extrabold text-white transition hover:brightness-105 disabled:opacity-60 inline-flex items-center justify-center gap-1.5 shrink-0"
            style={{ background: "var(--vet-green)" }}
          >
            {savingOption ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Guardar en la lista
          </button>
        </div>
      )}
    </div>
  );
}

function PrettySelect({
  id,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled: boolean;
  onChange: (v: ConsultaValue) => void;
}) {
  // Delegado al FancySelect compartido: el menú vive en un portal, así no
  // lo recortan los contenedores ni lo tapan las secciones siguientes.
  return (
    <FancySelect
      id={id}
      value={value}
      onChange={(v) => onChange(v)}
      options={options.map((o) => ({ value: o, label: o }))}
      placeholder={placeholder}
      disabled={disabled}
      fontSize={15}
      accent="var(--vet-green)"
      tokens={VET_TOKENS}
    />
  );
}

function PrettyDatePicker({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (v: ConsultaValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseISODate(value) ?? new Date());
  const [panelPos, setPanelPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    width: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = parseISODate(value);

  // El calendario se porta a <body> con posición fija: nada lo recorta ni
  // lo tapa, y se voltea hacia arriba si no hay espacio abajo.
  function openPanel() {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = Math.min(r.width, 340);
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const openUp = below < 430 && above > below;
    setPanelPos(
      openUp
        ? { left: r.left, bottom: window.innerHeight - r.top + 6, width }
        : { left: r.left, top: r.bottom + 6, width }
    );
    if (selected) setViewDate(selected);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll(e: Event) {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onResize() {
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(monthStart);
  const days = calendarDays(monthStart);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="h-12 w-full rounded-[12px] border px-4 pr-11 text-left text-[15px] font-bold outline-none transition focus:border-[color:var(--vet-green)] focus:ring-2 focus:ring-[color:var(--vet-green-glow)] disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--vet-bg-card) 96%, white), var(--vet-bg-card))",
          borderColor: open
            ? "color-mix(in oklab, var(--vet-green) 46%, var(--vet-border))"
            : "var(--vet-border)",
          color: value ? "var(--vet-text-1)" : "var(--vet-text-3)",
          boxShadow: open
            ? "0 0 0 3px var(--vet-green-glow), var(--shadow-soft-sm)"
            : "var(--shadow-soft-sm)",
        }}
      >
        <span className="block truncate">
          {selected ? formatDateLabel(selected) : "Selecciona fecha"}
        </span>
        <span
          className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[9px]"
          style={{
            background: "color-mix(in oklab, var(--vet-green) 10%, transparent)",
            color: "var(--vet-green)",
          }}
        >
          <CalendarDays className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </button>

      {open && !disabled && panelPos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-labelledby={`${id}-month`}
            className="vet-portal overflow-y-auto rounded-[16px] border p-3"
            style={{
              position: "fixed",
              left: panelPos.left,
              top: panelPos.top,
              bottom: panelPos.bottom,
              width: panelPos.width,
              zIndex: 130,
              minHeight: 0,
              maxHeight: "min(460px, calc(100dvh - 24px))",
              background: "var(--vet-bg-card)",
              borderColor:
                "color-mix(in oklab, var(--vet-green) 26%, var(--vet-border))",
              boxShadow: "0 18px 45px rgba(0,0,0,.16)",
            }}
          >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() =>
                setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition hover:brightness-95"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-2)",
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p
              id={`${id}-month`}
              className="text-[14px] font-black capitalize"
              style={{ color: "var(--vet-text-1)" }}
            >
              {monthLabel}
            </p>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() =>
                setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition hover:brightness-95"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-2)",
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div
            className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold uppercase"
            style={{ color: "var(--vet-text-3)" }}
          >
            {["L", "M", "M", "J", "V", "S", "D"].map((d, index) => (
              <span key={`${d}-${index}`} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const inMonth = day.getMonth() === viewDate.getMonth();
              const iso = toISODate(day);
              const active = iso === value;
              const today = iso === toISODate(new Date());
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className="aspect-square rounded-[10px] text-[13px] font-extrabold transition hover:brightness-95"
                  style={{
                    background: active
                      ? "linear-gradient(135deg, color-mix(in oklab, var(--vet-green-dim) 84%, black), var(--vet-green-dim))"
                      : today
                        ? "color-mix(in oklab, var(--vet-green) 10%, transparent)"
                        : "transparent",
                    border: today && !active ? "1px solid var(--vet-border)" : "1px solid transparent",
                    color: active
                      ? "#fff"
                      : inMonth
                        ? "var(--vet-text-1)"
                        : "var(--vet-text-3)",
                    opacity: inMonth ? 1 : 0.45,
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-3 h-10 w-full rounded-[11px] border text-[13px] font-extrabold transition hover:brightness-95"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-2)",
              }}
            >
              Limpiar fecha
            </button>
          )}
          </div>,
          document.body
        )}
    </div>
  );
}

function parseISODate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function calendarDays(monthStart: Date): Date[] {
  const start = new Date(monthStart);
  const mondayBasedOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayBasedOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return d;
  });
}
