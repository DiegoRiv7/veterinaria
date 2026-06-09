"use client";

/**
 * FormBuilder
 * -----------
 * Admin UI to design the per-service consulta form. Editable list on the
 * left (sections + fields), live read-only preview on the right (what the
 * vet will eventually see). Autosaves on a debounced timer.
 *
 * Field types covered: text, textarea, number, select, checkbox,
 * checkboxes, date, heading. Templates from lib/form-schema seed the
 * sections; the admin can then freely reorder, duplicate, edit, delete.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Pencil,
  X,
  ChevronDown,
  Layers,
  Eye,
  AlertCircle,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  type FormSchema,
  type FormSection,
  type FormField,
  type FieldType,
  newFieldId,
  newSectionId,
  fieldNeedsOptions,
  isVisualOnly,
  templateFor,
  TEMPLATE_KEYS,
  TEMPLATE_META,
  type TemplateKey,
} from "@/lib/form-schema";
import { updateServiceFormSchemaAction } from "@/app/actions/appointments";

/* ─── Field type metadata ───────────────────────────────────────── */

const FIELD_TYPE_META: Record<
  FieldType,
  { label: string; icon: string; description: string }
> = {
  text: { label: "Texto corto", icon: "📝", description: "Una línea." },
  textarea: {
    label: "Texto largo",
    icon: "📄",
    description: "Varias líneas (textarea).",
  },
  number: {
    label: "Número",
    icon: "🔢",
    description: "Numérico con unidad opcional.",
  },
  select: {
    label: "Selección única",
    icon: "📋",
    description: "Elige una opción de la lista.",
  },
  checkbox: {
    label: "Casilla sí/no",
    icon: "☑️",
    description: "Un toggle booleano.",
  },
  checkboxes: {
    label: "Casillas múltiples",
    icon: "☐☐",
    description: "Selecciona varias opciones.",
  },
  date: { label: "Fecha", icon: "📅", description: "Selector de fecha." },
  heading: {
    label: "Encabezado",
    icon: "⠿",
    description: "Sólo título — no se guarda valor.",
  },
};

const ALL_TYPES: FieldType[] = [
  "text",
  "textarea",
  "number",
  "select",
  "checkbox",
  "checkboxes",
  "date",
  "heading",
];

/* ─── Top-level component ───────────────────────────────────────── */

export function FormBuilder({
  schema: initialSchema,
  serviceId,
}: {
  schema: FormSchema;
  serviceId: string;
}) {
  const [schema, setSchema] = useState<FormSchema>(initialSchema);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingField, setEditingField] = useState<{
    sectionId: string;
    fieldId: string;
  } | null>(null);

  // Debounced autosave
  const dirtyRef = useRef(false);
  const lastSavedJsonRef = useRef<string>(JSON.stringify(initialSchema));

  const doSave = useCallback(
    async (next: FormSchema) => {
      const validation = validateSchemaForSave(next);
      if (!validation.ok) {
        // Don't toast on every keystroke — only warn if there's a clear
        // problem that already exists. We only block save here silently
        // and surface invalid state in the UI via highlight.
        return;
      }
      setSaving(true);
      try {
        const res = await updateServiceFormSchemaAction(serviceId, next);
        if (res.ok) {
          lastSavedJsonRef.current = JSON.stringify(next);
          setLastSavedAt(Date.now());
        } else {
          toast.error(res.error || "No se pudo guardar.");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar.");
      } finally {
        setSaving(false);
      }
    },
    [serviceId]
  );

  // Debounce: schedule save 1200ms after the last change.
  useEffect(() => {
    if (!dirtyRef.current) return;
    const json = JSON.stringify(schema);
    if (json === lastSavedJsonRef.current) return;
    const handle = setTimeout(() => {
      void doSave(schema);
    }, 1200);
    return () => clearTimeout(handle);
  }, [schema, doSave]);

  // Mark dirty whenever schema changes after first mount.
  function mutate(updater: (s: FormSchema) => FormSchema) {
    dirtyRef.current = true;
    setSchema((prev) => updater(prev));
  }

  // ── Schema mutations ────────────────────────────────────────────

  function applyTemplate(key: TemplateKey) {
    setTemplateOpen(false);
    if (
      !confirm(
        "Esto reemplazará los campos actuales del formulario. ¿Continuar?"
      )
    )
      return;
    const next = templateFor(key);
    mutate(() => next);
    toast.success(`Plantilla "${TEMPLATE_META[key].label}" aplicada`);
  }

  function addSection() {
    mutate((s) => ({
      ...s,
      sections: [
        ...s.sections,
        { id: newSectionId(), title: "Nueva sección", fields: [] },
      ],
    }));
  }

  function updateSection(sectionId: string, patch: Partial<FormSection>) {
    mutate((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, ...patch } : sec
      ),
    }));
  }

  function moveSection(sectionId: string, dir: -1 | 1) {
    mutate((s) => {
      const idx = s.sections.findIndex((x) => x.id === sectionId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= s.sections.length) return s;
      const next = [...s.sections];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...s, sections: next };
    });
  }

  function deleteSection(sectionId: string) {
    if (!confirm("¿Eliminar esta sección y todos sus campos?")) return;
    mutate((s) => ({
      ...s,
      sections: s.sections.filter((sec) => sec.id !== sectionId),
    }));
  }

  function duplicateSection(sectionId: string) {
    mutate((s) => {
      const idx = s.sections.findIndex((x) => x.id === sectionId);
      if (idx < 0) return s;
      const orig = s.sections[idx];
      const copy: FormSection = {
        ...orig,
        id: newSectionId(),
        title: orig.title ? `${orig.title} (copia)` : "Copia",
        fields: orig.fields.map((f) => ({ ...f, id: newFieldId() })),
      };
      const next = [...s.sections];
      next.splice(idx + 1, 0, copy);
      return { ...s, sections: next };
    });
  }

  function addField(sectionId: string, type: FieldType) {
    const newField: FormField = {
      id: newFieldId(),
      label:
        type === "heading"
          ? "Encabezado"
          : FIELD_TYPE_META[type].label,
      type,
      ...(fieldNeedsOptions(type) ? { options: ["Opción 1"] } : {}),
    };
    mutate((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, fields: [...sec.fields, newField] }
          : sec
      ),
    }));
    // Open the drawer for the freshly added field
    setEditingField({ sectionId, fieldId: newField.id });
  }

  function updateField(
    sectionId: string,
    fieldId: string,
    patch: Partial<FormField>
  ) {
    mutate((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              fields: sec.fields.map((f) =>
                f.id === fieldId ? mergeField(f, patch) : f
              ),
            }
          : sec
      ),
    }));
  }

  function deleteField(sectionId: string, fieldId: string) {
    mutate((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, fields: sec.fields.filter((f) => f.id !== fieldId) }
          : sec
      ),
    }));
  }

  function moveField(sectionId: string, fieldId: string, dir: -1 | 1) {
    mutate((s) => ({
      ...s,
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const idx = sec.fields.findIndex((f) => f.id === fieldId);
        const target = idx + dir;
        if (idx < 0 || target < 0 || target >= sec.fields.length) return sec;
        const fields = [...sec.fields];
        [fields[idx], fields[target]] = [fields[target], fields[idx]];
        return { ...sec, fields };
      }),
    }));
  }

  // ── Validation derived state ────────────────────────────────────

  const validationIssues = useMemo(() => issuesFor(schema), [schema]);
  const hasIssues = validationIssues.fieldsWithIssues.size > 0;

  // ── Drawer state lookup ─────────────────────────────────────────

  const drawerField = useMemo(() => {
    if (!editingField) return null;
    const sec = schema.sections.find((x) => x.id === editingField.sectionId);
    if (!sec) return null;
    const f = sec.fields.find((x) => x.id === editingField.fieldId);
    if (!f) return null;
    return { section: sec, field: f };
  }, [editingField, schema]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-[14px] border"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
        }}
      >
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => setTemplateOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[12px] font-extrabold border transition-colors"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-1)",
            }}
          >
            <Layers size={14} /> Aplicar plantilla{" "}
            <ChevronDown size={12} />
          </button>
          {templateOpen && (
            <TemplateMenu
              onPick={applyTemplate}
              onClose={() => setTemplateOpen(false)}
            />
          )}
        </div>

        <div className="flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-[1px]">
          {hasIssues && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full"
              style={{
                background: "color-mix(in oklab, var(--vet-red) 14%, transparent)",
                color: "var(--vet-red)",
              }}
            >
              <AlertCircle size={12} /> Revisa los campos marcados
            </span>
          )}
          <SaveIndicator
            saving={saving}
            lastSavedAt={lastSavedAt}
            hasIssues={hasIssues}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor column */}
        <div className="flex flex-col gap-3">
          {schema.sections.length === 0 && (
            <div
              className="border-dashed border p-8 rounded-[16px] text-center flex flex-col items-center gap-2"
              style={{
                borderColor: "var(--vet-border)",
                background: "var(--vet-bg-mid)",
              }}
            >
              <p
                className="text-[13px] font-extrabold"
                style={{ color: "var(--vet-text-1)" }}
              >
                Aún no hay secciones
              </p>
              <p
                className="text-[12px] font-semibold"
                style={{ color: "var(--vet-text-3)" }}
              >
                Empieza desde una plantilla o crea una sección en blanco.
              </p>
            </div>
          )}

          {schema.sections.map((sec, idx) => (
            <SectionCard
              key={sec.id}
              section={sec}
              index={idx}
              total={schema.sections.length}
              issues={validationIssues}
              onTitleChange={(title) => updateSection(sec.id, { title })}
              onMoveUp={() => moveSection(sec.id, -1)}
              onMoveDown={() => moveSection(sec.id, 1)}
              onDelete={() => deleteSection(sec.id)}
              onDuplicate={() => duplicateSection(sec.id)}
              onAddField={(type) => addField(sec.id, type)}
              onEditField={(fieldId) =>
                setEditingField({ sectionId: sec.id, fieldId })
              }
              onMoveField={(fieldId, dir) => moveField(sec.id, fieldId, dir)}
              onDeleteField={(fieldId) => deleteField(sec.id, fieldId)}
              onFieldLabelChange={(fieldId, label) =>
                updateField(sec.id, fieldId, { label })
              }
            />
          ))}

          <button
            type="button"
            onClick={addSection}
            className="self-start inline-flex items-center gap-1.5 px-3 h-10 rounded-[10px] text-[12px] font-extrabold border-dashed border-2 transition-colors"
            style={{
              borderColor: "var(--vet-green)",
              color: "var(--vet-green)",
              background: "transparent",
            }}
          >
            <Plus size={14} /> Agregar sección
          </button>
        </div>

        {/* Preview column */}
        <div className="lg:sticky lg:top-4 lg:self-start flex flex-col gap-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[10px]"
            style={{
              background: "var(--vet-bg-mid)",
              border: "1px solid var(--vet-border)",
            }}
          >
            <Eye size={14} style={{ color: "var(--vet-text-3)" }} />
            <p
              className="text-[11px] font-extrabold uppercase tracking-[1px]"
              style={{ color: "var(--vet-text-3)" }}
            >
              Vista previa — lo que verá el vet
            </p>
          </div>
          <SchemaPreview schema={schema} />
        </div>
      </div>

      {drawerField && (
        <FieldDrawer
          field={drawerField.field}
          onClose={() => setEditingField(null)}
          onChange={(patch) =>
            updateField(drawerField.section.id, drawerField.field.id, patch)
          }
          onDelete={() => {
            deleteField(drawerField.section.id, drawerField.field.id);
            setEditingField(null);
          }}
        />
      )}
    </div>
  );
}

/* ─── Save indicator ────────────────────────────────────────────── */

function SaveIndicator({
  saving,
  lastSavedAt,
  hasIssues,
}: {
  saving: boolean;
  lastSavedAt: number | null;
  hasIssues: boolean;
}) {
  if (saving) {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        style={{ color: "var(--vet-text-3)" }}
      >
        <Loader2 size={12} className="animate-spin" /> Guardando…
      </span>
    );
  }
  if (hasIssues) {
    return (
      <span style={{ color: "var(--vet-text-3)" }}>
        Pausado hasta corregir
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        style={{ color: "var(--vet-green)" }}
      >
        <Save size={12} /> Guardado
      </span>
    );
  }
  return null;
}

/* ─── Template picker ───────────────────────────────────────────── */

function TemplateMenu({
  onPick,
  onClose,
}: {
  onPick: (key: TemplateKey) => void;
  onClose: () => void;
}) {
  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-template-menu]")) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      data-template-menu
      className="absolute top-full left-0 mt-1 z-30 w-[280px] rounded-[12px] border shadow-lg overflow-hidden"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex flex-col max-h-[60vh] overflow-y-auto py-1">
        {TEMPLATE_KEYS.map((key) => {
          const meta = TEMPLATE_META[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className="flex items-start gap-2.5 text-left px-3 py-2.5 transition-colors hover:[background:var(--vet-bg-hover)]"
            >
              <span className="text-[18px] leading-none mt-0.5">
                {meta.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className="block text-[13px] font-extrabold"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  {meta.label}
                </span>
                <span
                  className="block text-[11px] font-semibold leading-snug"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {meta.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Section card ──────────────────────────────────────────────── */

function SectionCard({
  section,
  index,
  total,
  issues,
  onTitleChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
  onAddField,
  onEditField,
  onMoveField,
  onDeleteField,
  onFieldLabelChange,
}: {
  section: FormSection;
  index: number;
  total: number;
  issues: ValidationReport;
  onTitleChange: (title: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddField: (type: FieldType) => void;
  onEditField: (fieldId: string) => void;
  onMoveField: (fieldId: string, dir: -1 | 1) => void;
  onDeleteField: (fieldId: string) => void;
  onFieldLabelChange: (fieldId: string, label: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isEmpty = section.fields.length === 0;
  const empty = issues.emptySections.has(section.id);

  return (
    <div
      className="border rounded-[16px] flex flex-col"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: empty ? "var(--vet-red)" : "var(--vet-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: "var(--vet-border)" }}>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="w-7 h-7 rounded-[8px] inline-flex items-center justify-center border"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-2)",
          }}
          aria-label={collapsed ? "Expandir" : "Colapsar"}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          <ChevronDown
            size={14}
            style={{
              transform: collapsed ? "rotate(-90deg)" : "none",
              transition: "transform 150ms",
            }}
          />
        </button>
        <input
          value={section.title ?? ""}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Título de la sección"
          className="flex-1 h-9 px-2.5 rounded-[8px] border outline-none text-[14px] font-extrabold transition-colors focus:[border-color:var(--vet-green)]"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-1)",
          }}
        />
        <div className="flex items-center gap-1">
          <IconBtn
            icon={<ArrowUp size={13} />}
            onClick={onMoveUp}
            disabled={index === 0}
            label="Subir sección"
          />
          <IconBtn
            icon={<ArrowDown size={13} />}
            onClick={onMoveDown}
            disabled={index === total - 1}
            label="Bajar sección"
          />
          <IconBtn
            icon={<Copy size={13} />}
            onClick={onDuplicate}
            label="Duplicar"
          />
          <IconBtn
            icon={<Trash2 size={13} />}
            onClick={onDelete}
            tone="danger"
            label="Eliminar sección"
          />
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 flex flex-col gap-2">
          {isEmpty && (
            <div
              className="border-dashed border rounded-[12px] p-4 text-center"
              style={{
                borderColor: empty ? "var(--vet-red)" : "var(--vet-border)",
                background: "var(--vet-bg-mid)",
              }}
            >
              <p
                className="text-[12px] font-semibold"
                style={{
                  color: empty ? "var(--vet-red)" : "var(--vet-text-3)",
                }}
              >
                {empty
                  ? "Esta sección no tiene campos — no se guardará así."
                  : "Aún no hay campos en esta sección."}
              </p>
            </div>
          )}

          {section.fields.map((f, fIdx) => (
            <FieldRow
              key={f.id}
              field={f}
              index={fIdx}
              total={section.fields.length}
              hasIssue={issues.fieldsWithIssues.has(f.id)}
              onLabelChange={(label) => onFieldLabelChange(f.id, label)}
              onEdit={() => onEditField(f.id)}
              onMoveUp={() => onMoveField(f.id, -1)}
              onMoveDown={() => onMoveField(f.id, 1)}
              onDelete={() => onDeleteField(f.id)}
            />
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-[10px] text-[12px] font-extrabold border-dashed border-2 transition-colors"
              style={{
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-2)",
                background: "transparent",
              }}
            >
              <Plus size={14} /> Agregar campo
            </button>
            {pickerOpen && (
              <FieldTypePicker
                onPick={(t) => {
                  setPickerOpen(false);
                  onAddField(t);
                }}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Field row ─────────────────────────────────────────────────── */

function FieldRow({
  field,
  index,
  total,
  hasIssue,
  onLabelChange,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  field: FormField;
  index: number;
  total: number;
  hasIssue: boolean;
  onLabelChange: (label: string) => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const meta = FIELD_TYPE_META[field.type];

  return (
    <div
      className="flex items-center gap-2 p-2.5 rounded-[12px] border"
      style={{
        background: "var(--vet-bg-mid)",
        borderColor: hasIssue ? "var(--vet-red)" : "var(--vet-border)",
      }}
    >
      <span
        className="inline-flex items-center gap-1 px-1.5 h-6 rounded-[6px] text-[10px] font-extrabold whitespace-nowrap"
        style={{
          background: "var(--vet-bg-card)",
          border: "1px solid var(--vet-border)",
          color: "var(--vet-text-2)",
        }}
        title={meta.label}
      >
        <span>{meta.icon}</span>
        <span className="hidden sm:inline">{meta.label}</span>
      </span>
      <input
        value={field.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="Etiqueta del campo"
        className="flex-1 min-w-0 h-8 px-2 rounded-[6px] border outline-none text-[13px] font-bold transition-colors focus:[border-color:var(--vet-green)]"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: hasIssue ? "var(--vet-red)" : "var(--vet-border)",
          color: "var(--vet-text-1)",
        }}
      />
      {field.required && (
        <span
          className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
          style={{
            background:
              "color-mix(in oklab, var(--vet-green) 14%, transparent)",
            color: "var(--vet-green)",
          }}
          title="Requerido"
        >
          *
        </span>
      )}
      <div className="flex items-center gap-1">
        <IconBtn
          icon={<Pencil size={13} />}
          onClick={onEdit}
          label="Editar campo"
        />
        <IconBtn
          icon={<ArrowUp size={13} />}
          onClick={onMoveUp}
          disabled={index === 0}
          label="Subir"
        />
        <IconBtn
          icon={<ArrowDown size={13} />}
          onClick={onMoveDown}
          disabled={index === total - 1}
          label="Bajar"
        />
        <IconBtn
          icon={<Trash2 size={13} />}
          onClick={onDelete}
          tone="danger"
          label="Eliminar"
        />
      </div>
    </div>
  );
}

/* ─── Field type picker ─────────────────────────────────────────── */

function FieldTypePicker({
  onPick,
  onClose,
}: {
  onPick: (t: FieldType) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-field-type-picker]")) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      data-field-type-picker
      className="absolute bottom-full left-0 right-0 mb-1 z-20 rounded-[12px] border shadow-lg overflow-hidden"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
      }}
    >
      <div className="grid grid-cols-2 gap-1 p-1.5">
        {ALL_TYPES.map((t) => {
          const meta = FIELD_TYPE_META[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className="flex items-start gap-2 text-left p-2 rounded-[8px] transition-colors hover:[background:var(--vet-bg-hover)]"
            >
              <span className="text-[16px] leading-none mt-0.5">
                {meta.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className="block text-[12px] font-extrabold"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  {meta.label}
                </span>
                <span
                  className="block text-[10px] font-semibold leading-snug"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {meta.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Field drawer (modal) ──────────────────────────────────────── */

function FieldDrawer({
  field,
  onChange,
  onClose,
  onDelete,
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  // Lock body scroll while open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const meta = FIELD_TYPE_META[field.type];
  const showOptions = fieldNeedsOptions(field.type);
  const showPlaceholder =
    field.type === "text" ||
    field.type === "textarea" ||
    field.type === "number";
  const showUnit = field.type === "number";
  const isVisual = isVisualOnly(field.type);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{ background: "rgba(0,0,0,0.32)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full flex flex-col overflow-y-auto"
        style={{
          background: "var(--vet-bg-deep)",
          borderLeft: "1px solid var(--vet-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
          style={{
            background: "var(--vet-bg-deep)",
            borderColor: "var(--vet-border)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[18px] leading-none">{meta.icon}</span>
            <div className="min-w-0">
              <p
                className="text-[10px] font-extrabold uppercase tracking-[1px]"
                style={{ color: "var(--vet-text-3)" }}
              >
                Editar campo
              </p>
              <p
                className="text-[14px] font-extrabold truncate"
                style={{ color: "var(--vet-text-1)" }}
              >
                {field.label || "(sin etiqueta)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] inline-flex items-center justify-center border"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-4 p-4">
          <DrawerField label="Etiqueta">
            <input
              value={field.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="Ej. Peso del paciente"
              className={inputClass}
              style={{
                ...inputStyle,
                borderColor: field.label.trim()
                  ? "var(--vet-border)"
                  : "var(--vet-red)",
              }}
            />
            {!field.label.trim() && (
              <p
                className="text-[11px] font-bold mt-1"
                style={{ color: "var(--vet-red)" }}
              >
                Pon una etiqueta para este campo.
              </p>
            )}
          </DrawerField>

          <DrawerField label="Tipo de campo">
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_TYPES.map((t) => {
                const m = FIELD_TYPE_META[t];
                const active = t === field.type;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChange({ type: t })}
                    className="flex items-center gap-1.5 px-2 h-9 rounded-[8px] border text-[12px] font-extrabold transition-colors"
                    style={{
                      background: active
                        ? "color-mix(in oklab, var(--vet-green) 14%, transparent)"
                        : "var(--vet-bg-card)",
                      borderColor: active
                        ? "var(--vet-green)"
                        : "var(--vet-border)",
                      color: active
                        ? "var(--vet-green)"
                        : "var(--vet-text-2)",
                    }}
                  >
                    <span>{m.icon}</span>
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </DrawerField>

          {!isVisual && (
            <label
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] cursor-pointer"
              style={{
                background: "var(--vet-bg-card)",
                border: "1px solid var(--vet-border)",
              }}
            >
              <input
                type="checkbox"
                checked={!!field.required}
                onChange={(e) => onChange({ required: e.target.checked })}
                className="h-4 w-4"
              />
              <span
                className="text-[13px] font-extrabold"
                style={{ color: "var(--vet-text-1)" }}
              >
                Campo requerido
              </span>
            </label>
          )}

          {showPlaceholder && (
            <DrawerField label="Placeholder (opcional)">
              <input
                value={field.placeholder ?? ""}
                onChange={(e) =>
                  onChange({ placeholder: e.target.value })
                }
                placeholder="Texto guía dentro del campo"
                className={inputClass}
                style={inputStyle}
              />
            </DrawerField>
          )}

          {showUnit && (
            <DrawerField label="Unidad (opcional)">
              <input
                value={field.unit ?? ""}
                onChange={(e) => onChange({ unit: e.target.value })}
                placeholder="Ej. kg, °C, lpm, ml"
                className={inputClass}
                style={inputStyle}
              />
            </DrawerField>
          )}

          {!isVisual && (
            <DrawerField label="Texto de ayuda (opcional)">
              <textarea
                value={field.helpText ?? ""}
                onChange={(e) => onChange({ helpText: e.target.value })}
                placeholder="Frase corta que ayuda al vet a llenar este campo."
                rows={2}
                className={inputClass + " resize-none"}
                style={inputStyle}
              />
            </DrawerField>
          )}

          {showOptions && (
            <DrawerField label="Opciones">
              <OptionsEditor
                options={field.options ?? []}
                onChange={(options) => onChange({ options })}
              />
            </DrawerField>
          )}

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-1.5 h-10 rounded-[10px] text-[12px] font-extrabold border mt-auto"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-red)",
            }}
          >
            <Trash2 size={13} /> Eliminar este campo
          </button>
        </div>
      </div>
    </div>
  );
}

function DrawerField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5"
        style={{ color: "var(--vet-text-3)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.length === 0 && (
        <p
          className="text-[11px] font-bold"
          style={{ color: "var(--vet-red)" }}
        >
          Agrega al menos una opción.
        </p>
      )}
      {options.map((opt, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <input
            value={opt}
            onChange={(e) => {
              const next = [...options];
              next[idx] = e.target.value;
              onChange(next);
            }}
            placeholder={`Opción ${idx + 1}`}
            className={inputClass}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => {
              const next = [...options];
              next.splice(idx, 1);
              onChange(next);
            }}
            className="w-9 h-9 rounded-[8px] inline-flex items-center justify-center border flex-shrink-0"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-red)",
            }}
            aria-label="Eliminar opción"
            title="Eliminar opción"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, ""])}
        className="self-start inline-flex items-center gap-1 px-2.5 h-8 rounded-[8px] text-[11px] font-extrabold border-dashed border-2"
        style={{
          borderColor: "var(--vet-border)",
          color: "var(--vet-text-2)",
          background: "transparent",
        }}
      >
        <Plus size={12} /> Agregar opción
      </button>
    </div>
  );
}

/* ─── Live preview ──────────────────────────────────────────────── */

function SchemaPreview({ schema }: { schema: FormSchema }) {
  if (schema.sections.length === 0) {
    return (
      <div
        className="border-dashed border p-8 rounded-[16px] text-center"
        style={{
          borderColor: "var(--vet-border)",
          background: "var(--vet-bg-card)",
        }}
      >
        <p
          className="text-[12px] font-semibold"
          style={{ color: "var(--vet-text-3)" }}
        >
          La vista previa aparecerá aquí mientras editas.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {schema.sections.map((sec) => (
        <div
          key={sec.id}
          className="border rounded-[16px] p-4 flex flex-col gap-3"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
          }}
        >
          {sec.title && (
            <p
              className="text-[13px] font-black"
              style={{ color: "var(--vet-text-1)" }}
            >
              {sec.title}
            </p>
          )}
          {sec.fields.length === 0 ? (
            <p
              className="text-[11px] font-semibold"
              style={{ color: "var(--vet-text-3)" }}
            >
              (sección vacía)
            </p>
          ) : (
            sec.fields.map((f) => <PreviewField key={f.id} field={f} />)
          )}
        </div>
      ))}
    </div>
  );
}

function PreviewField({ field }: { field: FormField }) {
  if (field.type === "heading") {
    return (
      <div className="pt-2">
        <p
          className="text-[14px] font-black"
          style={{ color: "var(--vet-text-1)" }}
        >
          {field.label || "(encabezado)"}
        </p>
        {field.helpText && (
          <p
            className="text-[11px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            {field.helpText}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[11px] font-extrabold uppercase tracking-wider"
        style={{ color: "var(--vet-text-3)" }}
      >
        {field.label || "(sin etiqueta)"}
        {field.required && (
          <span style={{ color: "var(--vet-red)" }}> *</span>
        )}
      </label>

      {field.type === "text" && (
        <input
          disabled
          placeholder={field.placeholder ?? ""}
          className={previewInput}
          style={previewInputStyle}
        />
      )}
      {field.type === "textarea" && (
        <textarea
          disabled
          placeholder={field.placeholder ?? ""}
          rows={3}
          className={previewInput + " resize-none"}
          style={previewInputStyle}
        />
      )}
      {field.type === "number" && (
        <div className="flex items-center gap-1.5">
          <input
            disabled
            type="number"
            placeholder={field.placeholder ?? ""}
            className={previewInput + " vet-mono"}
            style={previewInputStyle}
          />
          {field.unit && (
            <span
              className="text-[12px] font-extrabold px-2 py-1 rounded-[8px]"
              style={{
                background: "var(--vet-bg-mid)",
                color: "var(--vet-text-2)",
              }}
            >
              {field.unit}
            </span>
          )}
        </div>
      )}
      {field.type === "date" && (
        <input
          disabled
          type="date"
          className={previewInput}
          style={previewInputStyle}
        />
      )}
      {field.type === "select" && (
        <select disabled className={previewInput} style={previewInputStyle}>
          <option>— Elegir —</option>
          {(field.options ?? []).map((opt, idx) => (
            <option key={idx}>{opt}</option>
          ))}
        </select>
      )}
      {field.type === "checkbox" && (
        <label
          className="flex items-center gap-2 px-3 py-2 rounded-[8px]"
          style={{
            background: "var(--vet-bg-mid)",
            border: "1px solid var(--vet-border)",
          }}
        >
          <input disabled type="checkbox" className="h-4 w-4" />
          <span
            className="text-[12px] font-bold"
            style={{ color: "var(--vet-text-2)" }}
          >
            {field.placeholder || "Marcar si aplica"}
          </span>
        </label>
      )}
      {field.type === "checkboxes" && (
        <div className="flex flex-wrap gap-1.5">
          {(field.options ?? []).map((opt, idx) => (
            <label
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px]"
              style={{
                background: "var(--vet-bg-mid)",
                border: "1px solid var(--vet-border)",
              }}
            >
              <input disabled type="checkbox" className="h-3.5 w-3.5" />
              <span
                className="text-[12px] font-bold"
                style={{ color: "var(--vet-text-2)" }}
              >
                {opt}
              </span>
            </label>
          ))}
        </div>
      )}

      {field.helpText && (
        <p
          className="text-[11px] font-semibold mt-0.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          {field.helpText}
        </p>
      )}
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function mergeField(prev: FormField, patch: Partial<FormField>): FormField {
  const next: FormField = { ...prev, ...patch };
  // If the type changed, clean up irrelevant fields.
  if (patch.type && patch.type !== prev.type) {
    if (!fieldNeedsOptions(next.type)) {
      delete next.options;
    } else if (!next.options || next.options.length === 0) {
      next.options = ["Opción 1"];
    }
    if (next.type !== "number") delete next.unit;
    if (isVisualOnly(next.type)) {
      delete next.required;
      delete next.placeholder;
    }
  }
  return next;
}

type ValidationReport = {
  fieldsWithIssues: Set<string>;
  emptySections: Set<string>;
};

function issuesFor(schema: FormSchema): ValidationReport {
  const fieldsWithIssues = new Set<string>();
  const emptySections = new Set<string>();
  for (const sec of schema.sections) {
    if (sec.fields.length === 0) emptySections.add(sec.id);
    for (const f of sec.fields) {
      if (!f.label.trim()) {
        fieldsWithIssues.add(f.id);
        continue;
      }
      if (fieldNeedsOptions(f.type)) {
        const opts = (f.options ?? []).filter((o) => o.trim().length > 0);
        if (opts.length === 0) fieldsWithIssues.add(f.id);
      }
    }
  }
  return { fieldsWithIssues, emptySections };
}

function validateSchemaForSave(
  schema: FormSchema
): { ok: true } | { ok: false; reason: string } {
  for (const sec of schema.sections) {
    for (const f of sec.fields) {
      if (!f.label.trim()) {
        return { ok: false, reason: "Hay un campo sin etiqueta." };
      }
      if (fieldNeedsOptions(f.type)) {
        const opts = (f.options ?? []).filter((o) => o.trim().length > 0);
        if (opts.length === 0) {
          return {
            ok: false,
            reason: `El campo "${f.label}" necesita al menos una opción.`,
          };
        }
      }
    }
  }
  return { ok: true };
}

/* ─── Tiny shared primitives ────────────────────────────────────── */

function IconBtn({
  icon,
  onClick,
  label,
  disabled,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] border transition-colors disabled:opacity-40"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        color: tone === "danger" ? "var(--vet-red)" : "var(--vet-text-2)",
      }}
    >
      {icon}
    </button>
  );
}

const inputClass =
  "w-full h-10 px-3 rounded-[10px] border outline-none text-[13px] font-bold transition-colors focus:[border-color:var(--vet-green)]";
const inputStyle = {
  background: "var(--vet-bg-card)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
} as const;

const previewInput =
  "w-full h-10 px-3 rounded-[10px] border text-[13px] font-bold disabled:cursor-default";
const previewInputStyle = {
  background: "var(--vet-bg-mid)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
  opacity: 1,
} as const;
