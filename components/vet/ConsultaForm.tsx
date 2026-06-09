"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import type {
  ConsultaData,
  ConsultaValue,
  FormField,
  FormSchema,
  FormSection,
} from "@/lib/form-schema";
import { saveConsultaDataAction } from "@/app/actions/appointments";

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
 * - When `completed` is true (cita ya cerrada), inputs are read-only and
 *   the only visible action is a placeholder "Reabrir" button (disabled).
 */
export function ConsultaForm({
  schema,
  initial,
  appointmentId,
  disabled = false,
  completed = false,
}: {
  schema: FormSchema;
  initial: ConsultaData;
  appointmentId: string;
  disabled?: boolean;
  completed?: boolean;
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
    seedValues(dataFieldIds, schema, initial)
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);

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

  async function handleSaveDraft() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const ok = await persist(values);
    if (ok) {
      toast.success("Borrador guardado");
      router.refresh();
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

  return (
    <div className="flex flex-col gap-6">
      {/* Save indicator pill */}
      <div className="flex items-center justify-end min-h-[20px]">
        <SaveIndicator saving={saving} savedAt={savedAt} disabled={readOnly} />
      </div>

      {schema.sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          values={values}
          onChange={setFieldValue}
          readOnly={readOnly}
        />
      ))}

      {/* Footer actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
        {completed ? (
          <button
            type="button"
            disabled
            title="Próximamente — reabrir cita"
            className="h-12 px-5 rounded-[14px] text-[14px] font-extrabold border opacity-60 cursor-not-allowed"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
          >
            Reabrir cita
          </button>
        ) : disabled ? null : (
          <>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || finalizing}
              className="h-12 px-5 rounded-[14px] text-[14px] font-extrabold border transition disabled:opacity-60"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-1)",
              }}
            >
              {saving && !finalizing ? "Guardando…" : "Guardar borrador"}
            </button>
            <button
              type="button"
              onClick={handleMarkCompleted}
              disabled={saving || finalizing}
              className="h-12 px-5 rounded-[14px] text-[14px] font-extrabold text-white transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
              style={{
                background:
                  "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
                boxShadow: "0 10px 24px var(--vet-green-glow)",
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
  initial: ConsultaData
): ConsultaData {
  const out: ConsultaData = {};
  // Build lookup of field type by id
  const fieldType = new Map<string, FormField["type"]>();
  for (const section of schema.sections) {
    for (const field of section.fields) {
      fieldType.set(field.id, field.type);
    }
  }
  for (const id of ids) {
    const fromInitial = initial[id];
    if (fromInitial !== undefined && fromInitial !== null) {
      out[id] = fromInitial;
      continue;
    }
    const t = fieldType.get(id);
    if (t === "checkbox") out[id] = false;
    else if (t === "checkboxes") out[id] = [];
    else out[id] = "";
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
}: {
  section: FormSection;
  values: ConsultaData;
  onChange: (id: string, v: ConsultaValue) => void;
  readOnly: boolean;
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
}: {
  field: FormField;
  value: ConsultaValue | undefined;
  onChange: (v: ConsultaValue) => void;
  readOnly: boolean;
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
}: {
  field: FormField;
  value: ConsultaValue | undefined;
  onChange: (v: ConsultaValue) => void;
  readOnly: boolean;
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
        <input
          id={`f-${field.id}`}
          type="date"
          className={`h-12 ${baseInputClass}`}
          style={inputStyle}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      );

    case "select":
      return (
        <select
          id={`f-${field.id}`}
          className={`h-12 ${baseInputClass} appearance-none pr-10 bg-no-repeat`}
          style={{
            ...inputStyle,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23999' stroke-width='2'><polyline points='3 6 8 11 13 6'/></svg>\")",
            backgroundPosition: "right 12px center",
            backgroundSize: "16px",
          }}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        >
          <option value="">— Selecciona —</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
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
