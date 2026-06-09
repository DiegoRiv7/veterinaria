"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  Eye,
  GripVertical,
  Layers,
  Loader2,
  Plus,
  Pencil,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  type FieldType,
  type FormField,
  type FormSchema,
  type FormSection,
  fieldNeedsOptions,
  isVisualOnly,
  newFieldId,
  newSectionId,
  templateFor,
  TEMPLATE_KEYS,
  TEMPLATE_META,
  type TemplateKey,
} from "@/lib/form-schema";
import { updateServiceFormSchemaAction } from "@/app/actions/appointments";

const FIELD_TYPE_META: Record<
  FieldType,
  { label: string; icon: string; short: string }
> = {
  text: { label: "Texto corto", icon: "T", short: "Una línea" },
  textarea: { label: "Nota larga", icon: "¶", short: "Párrafo" },
  number: { label: "Número", icon: "#", short: "Cantidad" },
  select: { label: "Opciones", icon: "▾", short: "Una elección" },
  checkbox: { label: "Sí / No", icon: "✓", short: "Casilla" },
  checkboxes: { label: "Checklist", icon: "☑", short: "Varias" },
  date: { label: "Fecha", icon: "D", short: "Calendario" },
  heading: { label: "Título", icon: "H", short: "Separador" },
};

const PALETTE_TYPES: FieldType[] = ["textarea", "text", "select", "checkboxes", "number", "date", "heading"];

type Selection = { sectionId: string; fieldId: string } | null;
type DragPayload =
  | { kind: "existing"; sectionId: string; fieldId: string }
  | { kind: "new"; type: FieldType };

export function FormBuilder({
  schema: initialSchema,
  serviceId,
}: {
  schema: FormSchema;
  serviceId: string;
}) {
  const [schema, setSchema] = useState<FormSchema>(() =>
    ensureCanvasSchema(initialSchema)
  );
  const [selection, setSelection] = useState<Selection>(() => firstField(initialSchema));
  const [templateOpen, setTemplateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const dirtyRef = useRef(false);
  const lastSavedJsonRef = useRef(JSON.stringify(ensureCanvasSchema(initialSchema)));

  const validation = useMemo(() => issuesFor(schema), [schema]);
  const selected = useMemo(() => {
    if (!selection) return null;
    const section = schema.sections.find((s) => s.id === selection.sectionId);
    const field = section?.fields.find((f) => f.id === selection.fieldId);
    return section && field ? { section, field } : null;
  }, [schema, selection]);

  const doSave = useCallback(
    async (next: FormSchema) => {
      const result = validateSchemaForSave(next);
      if (!result.ok) return;

      setSaving(true);
      try {
        const res = await updateServiceFormSchemaAction(serviceId, next);
        if (!res.ok) {
          toast.error(res.error || "No se pudo guardar.");
          return;
        }
        lastSavedJsonRef.current = JSON.stringify(next);
        setLastSavedAt(Date.now());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar.");
      } finally {
        setSaving(false);
      }
    },
    [serviceId]
  );

  useEffect(() => {
    if (!dirtyRef.current) return;
    const json = JSON.stringify(schema);
    if (json === lastSavedJsonRef.current) return;
    const timer = setTimeout(() => void doSave(schema), 900);
    return () => clearTimeout(timer);
  }, [schema, doSave]);

  function mutate(updater: (current: FormSchema) => FormSchema) {
    dirtyRef.current = true;
    setSchema((current) => ensureCanvasSchema(updater(current)));
  }

  function applyTemplate(key: TemplateKey) {
    setTemplateOpen(false);
    if (!confirm("Esto reemplazará el lienzo actual. ¿Continuar?")) return;
    const next = ensureCanvasSchema(templateFor(key));
    mutate(() => next);
    setSelection(firstField(next));
    toast.success(`Plantilla "${TEMPLATE_META[key].label}" aplicada`);
  }

  function addSection() {
    const section: FormSection = {
      id: newSectionId(),
      title: "Nuevo grupo",
      fields: [createField("textarea")],
    };
    mutate((s) => ({ ...s, sections: [...s.sections, section] }));
    setSelection({ sectionId: section.id, fieldId: section.fields[0].id });
  }

  function updateSection(sectionId: string, patch: Partial<FormSection>) {
    mutate((s) => ({
      ...s,
      sections: s.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    }));
  }

  function deleteSection(sectionId: string) {
    if (!confirm("¿Eliminar este grupo y sus cuadros?")) return;
    mutate((s) => {
      const sections = s.sections.filter((section) => section.id !== sectionId);
      return {
        ...s,
        sections:
          sections.length > 0
            ? sections
            : [{ id: newSectionId(), title: "Consulta", fields: [] }],
      };
    });
    if (selection?.sectionId === sectionId) setSelection(null);
  }

  function addField(sectionId: string, type: FieldType) {
    const field = createField(type);
    mutate((s) => ({
      ...s,
      sections: s.sections.map((section) =>
        section.id === sectionId
          ? { ...section, fields: [...section.fields, field] }
          : section
      ),
    }));
    setSelection({ sectionId, fieldId: field.id });
  }

  function addNoteBlock(sectionId: string) {
    const field = createField("textarea");
    field.label = "Nueva nota";
    field.placeholder = "Escribe aquí...";
    mutate((s) => ({
      ...s,
      sections: s.sections.map((section) =>
        section.id === sectionId
          ? { ...section, fields: [...section.fields, field] }
          : section
      ),
    }));
    setSelection({ sectionId, fieldId: field.id });
  }

  function updateField(
    sectionId: string,
    fieldId: string,
    patch: Partial<FormField>
  ) {
    mutate((s) => ({
      ...s,
      sections: s.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) =>
                field.id === fieldId ? mergeField(field, patch) : field
              ),
            }
          : section
      ),
    }));
  }

  function duplicateField(sectionId: string, fieldId: string) {
    let nextSelection: Selection = null;
    mutate((s) => ({
      ...s,
      sections: s.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const index = section.fields.findIndex((field) => field.id === fieldId);
        if (index < 0) return section;
        const copy = {
          ...section.fields[index],
          id: newFieldId(),
          label: `${section.fields[index].label} copia`,
        };
        const fields = [...section.fields];
        fields.splice(index + 1, 0, copy);
        nextSelection = { sectionId, fieldId: copy.id };
        return { ...section, fields };
      }),
    }));
    setSelection(nextSelection);
  }

  function deleteField(sectionId: string, fieldId: string) {
    mutate((s) => ({
      ...s,
      sections: s.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.filter((field) => field.id !== fieldId),
            }
          : section
      ),
    }));
    if (selection?.fieldId === fieldId) setSelection(null);
  }

  function placeField(
    from: DragPayload,
    to: { sectionId: string; index: number }
  ) {
    mutate((s) => {
      if (from.kind === "new") {
        const field = createField(from.type);
        return {
          ...s,
          sections: s.sections.map((section) => {
            if (section.id !== to.sectionId) return section;
            const fields = [...section.fields];
            const safeIndex = Math.max(0, Math.min(to.index, fields.length));
            fields.splice(safeIndex, 0, field);
            return { ...section, fields };
          }),
        };
      }

      const source = s.sections.find((section) => section.id === from.sectionId);
      const field = source?.fields.find((item) => item.id === from.fieldId);
      if (!source || !field) return s;

      const without = s.sections.map((section) =>
        section.id === from.sectionId
          ? {
              ...section,
              fields: section.fields.filter((item) => item.id !== from.fieldId),
            }
          : section
      );

      return {
        ...s,
        sections: without.map((section) => {
          if (section.id !== to.sectionId) return section;
          const fields = [...section.fields];
          let safeIndex = Math.max(0, Math.min(to.index, fields.length));
          if (from.sectionId === to.sectionId) {
            const originalIndex = source.fields.findIndex(
              (item) => item.id === from.fieldId
            );
            if (originalIndex >= 0 && originalIndex < to.index) safeIndex--;
          }
          fields.splice(safeIndex, 0, field);
          return { ...section, fields };
        }),
      };
    });
  }

  const firstSectionId = schema.sections[0]?.id;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_300px] gap-4 items-start">
      <aside className="xl:sticky xl:top-4 flex xl:flex-col gap-2 overflow-x-auto xl:overflow-visible">
        <div
          className="rounded-[16px] border p-2 flex xl:flex-col gap-2 min-w-max xl:min-w-0"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
          }}
        >
          {PALETTE_TYPES.map((type) => (
            <PaletteBlock
              key={type}
              type={type}
              onClick={() => firstSectionId && addField(firstSectionId, type)}
              onDragStart={() => setDragging({ kind: "new", type })}
              onDragEnd={() => setDragging(null)}
            />
          ))}

          <button
            type="button"
            onClick={addSection}
            className="h-10 px-3 rounded-[10px] border border-dashed inline-flex items-center gap-2 text-[12px] font-extrabold"
            style={{
              background: "transparent",
              borderColor: "var(--vet-green)",
              color: "var(--vet-green)",
            }}
          >
            <Plus size={14} /> Grupo
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex flex-col gap-3">
        <div
          className="rounded-[18px] border p-3 flex items-center justify-between gap-3 flex-wrap"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
          }}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setTemplateOpen((open) => !open)}
              className="h-10 px-3 rounded-[10px] border inline-flex items-center gap-2 text-[12px] font-extrabold"
              style={{
                background: "var(--vet-bg-mid)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-1)",
              }}
            >
              <Layers size={14} /> Plantilla <ChevronDown size={13} />
            </button>
            {templateOpen && (
              <TemplateMenu
                onPick={applyTemplate}
                onClose={() => setTemplateOpen(false)}
              />
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider">
            <div
              className="inline-flex items-center rounded-[10px] border p-0.5"
              style={{
                background: "var(--vet-bg-mid)",
                borderColor: "var(--vet-border)",
              }}
            >
              {[
                { value: "edit" as const, label: "Editar", icon: Pencil },
                { value: "preview" as const, label: "Preview", icon: Eye },
              ].map((item) => {
                const active = mode === item.value;
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMode(item.value)}
                    className="h-8 px-2.5 rounded-[8px] inline-flex items-center gap-1.5 text-[11px] font-extrabold"
                    style={{
                      background: active ? "var(--vet-bg-card)" : "transparent",
                      color: active ? "var(--vet-green)" : "var(--vet-text-2)",
                    }}
                  >
                    <Icon size={13} /> {item.label}
                  </button>
                );
              })}
            </div>
            {validation.fieldsWithIssues.size > 0 && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full"
                style={{
                  background:
                    "color-mix(in oklab, var(--vet-red) 12%, transparent)",
                  color: "var(--vet-red)",
                }}
              >
                <AlertCircle size={12} /> Revisar
              </span>
            )}
            <SaveIndicator
              saving={saving}
              lastSavedAt={lastSavedAt}
              hasIssues={validation.fieldsWithIssues.size > 0}
            />
          </div>
        </div>

        <div
          className="rounded-[22px] border p-3 sm:p-5"
          style={{
            background:
              "linear-gradient(180deg, var(--vet-bg-mid), var(--vet-bg-deep))",
            borderColor: "var(--vet-border)",
          }}
        >
          <div
            className="mx-auto w-full max-w-[760px] rounded-[20px] border p-4 sm:p-6 flex flex-col gap-5"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              boxShadow: "0 18px 45px rgba(80, 45, 25, 0.10)",
            }}
          >
            {mode === "preview" ? (
              <ConsultaPreview schema={schema} />
            ) : (
              schema.sections.map((section) => (
                <CanvasSection
                  key={section.id}
                  section={section}
                  selectedFieldId={selection?.fieldId ?? null}
                  issues={validation}
                  dragging={dragging}
                  onSelect={(fieldId) =>
                    setSelection({ sectionId: section.id, fieldId })
                  }
                  onSectionTitle={(title) =>
                    updateSection(section.id, { title })
                  }
                  onDeleteSection={() => deleteSection(section.id)}
                  onAddField={(type) => addField(section.id, type)}
                  onAddNote={() => addNoteBlock(section.id)}
                  onUpdateField={(fieldId, patch) =>
                    updateField(section.id, fieldId, patch)
                  }
                  onDuplicateField={(fieldId) =>
                    duplicateField(section.id, fieldId)
                  }
                  onDeleteField={(fieldId) => deleteField(section.id, fieldId)}
                  onDragStart={(fieldId) =>
                    setDragging({ kind: "existing", sectionId: section.id, fieldId })
                  }
                  onDragEnd={() => setDragging(null)}
                  onDropAt={(index) => {
                    if (!dragging) return;
                    placeField(dragging, { sectionId: section.id, index });
                    setDragging(null);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {mode === "edit" && (
        <aside className="xl:sticky xl:top-4">
          <Inspector
            selected={selected}
            onChange={(patch) => {
              if (!selected) return;
              updateField(selected.section.id, selected.field.id, patch);
            }}
            onDelete={() => {
              if (!selected) return;
              deleteField(selected.section.id, selected.field.id);
            }}
          />
        </aside>
      )}
    </div>
  );
}

function CanvasSection({
  section,
  selectedFieldId,
  issues,
  dragging,
  onSelect,
  onSectionTitle,
  onDeleteSection,
  onAddField,
  onAddNote,
  onUpdateField,
  onDuplicateField,
  onDeleteField,
  onDragStart,
  onDragEnd,
  onDropAt,
}: {
  section: FormSection;
  selectedFieldId: string | null;
  issues: ValidationReport;
  dragging: DragPayload | null;
  onSelect: (fieldId: string) => void;
  onSectionTitle: (title: string) => void;
  onDeleteSection: () => void;
  onAddField: (type: FieldType) => void;
  onAddNote: () => void;
  onUpdateField: (fieldId: string, patch: Partial<FormField>) => void;
  onDuplicateField: (fieldId: string) => void;
  onDeleteField: (fieldId: string) => void;
  onDragStart: (fieldId: string) => void;
  onDragEnd: () => void;
  onDropAt: (index: number) => void;
}) {
  const [adderOpen, setAdderOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={section.title ?? ""}
          onChange={(e) => onSectionTitle(e.target.value)}
          placeholder="Título del grupo"
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-[18px] sm:text-[20px] font-black"
          style={{ color: "var(--vet-text-1)" }}
        />
        <button
          type="button"
          onClick={onDeleteSection}
          className="w-8 h-8 rounded-[8px] border inline-flex items-center justify-center"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-red)",
          }}
          aria-label="Eliminar grupo"
          title="Eliminar grupo"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {section.fields.map((field, index) => (
        <div key={field.id}>
          <CanvasBlock
            field={field}
            selected={selectedFieldId === field.id}
            hasIssue={issues.fieldsWithIssues.has(field.id)}
            onSelect={() => onSelect(field.id)}
            onChange={(patch) => onUpdateField(field.id, patch)}
            onDuplicate={() => onDuplicateField(field.id)}
            onDelete={() => onDeleteField(field.id)}
            onDragStart={() => onDragStart(field.id)}
            onDragEnd={onDragEnd}
            onDrop={(after) => onDropAt(index + (after ? 1 : 0))}
            dragging={!!dragging}
          />
        </div>
      ))}

      {section.fields.length === 0 && (
        <div
          className="border border-dashed rounded-[14px] p-6 text-center"
          style={{
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-3)",
          }}
        >
          <p className="text-[12px] font-bold">Grupo vacío</p>
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={onAddNote}
          className="h-10 px-3 rounded-[10px] border border-dashed inline-flex items-center gap-2 text-[12px] font-extrabold"
          style={{
            background: "transparent",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-2)",
          }}
        >
          <Plus size={14} /> Agregar cuadro
        </button>
        <button
          type="button"
          onClick={() => setAdderOpen((open) => !open)}
          className="ml-2 h-10 px-3 rounded-[10px] border inline-flex items-center gap-2 text-[12px] font-extrabold"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-2)",
          }}
        >
          Más <ChevronDown size={13} />
        </button>
        {adderOpen && (
          <FieldTypeMenu
            onPick={(type) => {
              setAdderOpen(false);
              onAddField(type);
            }}
            onClose={() => setAdderOpen(false)}
          />
        )}
      </div>
    </section>
  );
}

function PaletteBlock({
  type,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  type: FieldType;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const meta = FIELD_TYPE_META[type];
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("text/plain", `new:${type}`);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="w-full min-w-[150px] xl:min-w-0 rounded-[12px] border p-2.5 text-left transition-colors hover:[border-color:var(--vet-green)]"
      style={{
        background: "var(--vet-bg-mid)",
        borderColor: "var(--vet-border)",
        color: "var(--vet-text-1)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center vet-mono text-[12px] font-black"
          style={{
            background: "var(--vet-bg-card)",
            color: "var(--vet-green)",
          }}
        >
          {meta.icon}
        </span>
        <span className="min-w-0">
          <span className="block text-[12px] font-black truncate">
            {meta.label}
          </span>
          <span
            className="block text-[10px] font-bold truncate"
            style={{ color: "var(--vet-text-3)" }}
          >
            {meta.short}
          </span>
        </span>
      </div>
    </button>
  );
}

function CanvasBlock({
  field,
  selected,
  hasIssue,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrop,
  dragging,
}: {
  field: FormField;
  selected: boolean;
  hasIssue: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<FormField>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: (after: boolean) => void;
  dragging: boolean;
}) {
  const meta = FIELD_TYPE_META[field.type];
  const visual = isVisualOnly(field.type);

  return (
    <article
      onDragOver={(e) => {
        if (!dragging) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (!dragging) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        onDrop(e.clientY > rect.top + rect.height / 2);
      }}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className="group rounded-[16px] border p-3 sm:p-4 transition-all cursor-pointer"
      style={{
        background: selected ? "var(--vet-bg-deep)" : "var(--vet-bg-card)",
        borderColor: hasIssue
          ? "var(--vet-red)"
          : selected
            ? "var(--vet-green)"
            : "var(--vet-border)",
        boxShadow: selected ? "0 10px 26px rgba(120, 65, 35, 0.12)" : "none",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", field.id);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          className="mt-1 w-8 h-8 rounded-[10px] border inline-flex items-center justify-center flex-shrink-0"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: selected ? "var(--vet-green)" : "var(--vet-text-3)",
          }}
          title="Mover"
        >
          <GripVertical size={15} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1 h-6 px-2 rounded-[7px] text-[10px] font-extrabold"
              style={{
                background: "var(--vet-bg-mid)",
                color: selected ? "var(--vet-green)" : "var(--vet-text-2)",
              }}
            >
              <span className="vet-mono">{meta.icon}</span>
              {meta.label}
            </span>
            {field.required && !visual && (
              <span
                className="text-[10px] font-extrabold"
                style={{ color: "var(--vet-red)" }}
              >
                Requerido
              </span>
            )}
          </div>

          <input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={visual ? "Título" : "Escribe el título o pregunta"}
            className="w-full bg-transparent border-none outline-none text-[16px] sm:text-[17px] font-black"
            style={{ color: "var(--vet-text-1)" }}
          />

          <BlockPreview field={field} onChange={onChange} />
        </div>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="w-8 h-8 rounded-[8px] border inline-flex items-center justify-center"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
            aria-label="Duplicar"
            title="Duplicar"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-8 h-8 rounded-[8px] border inline-flex items-center justify-center"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-red)",
            }}
            aria-label="Eliminar"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ConsultaPreview({ schema }: { schema: FormSchema }) {
  return (
    <div className="flex flex-col gap-6">
      {schema.sections.map((section) => (
        <section key={section.id} className="flex flex-col gap-3">
          {section.title && (
            <h2
              className="text-[18px] font-black"
              style={{ color: "var(--vet-text-1)" }}
            >
              {section.title}
            </h2>
          )}
          {section.fields.length === 0 ? (
            <p
              className="text-[12px] font-bold"
              style={{ color: "var(--vet-text-3)" }}
            >
              Sin campos
            </p>
          ) : (
            section.fields.map((field) => (
              <PreviewField key={field.id} field={field} />
            ))
          )}
        </section>
      ))}
    </div>
  );
}

function PreviewField({ field }: { field: FormField }) {
  if (field.type === "heading") {
    return (
      <div className="pt-2">
        <p
          className="text-[15px] font-black"
          style={{ color: "var(--vet-text-1)" }}
        >
          {field.label || "Título"}
        </p>
        {field.helpText && (
          <p
            className="text-[12px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            {field.helpText}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[11px] font-extrabold uppercase tracking-wider"
        style={{ color: "var(--vet-text-3)" }}
      >
        {field.label || "Campo"}
        {field.required && <span style={{ color: "var(--vet-red)" }}> *</span>}
      </label>

      {field.type === "textarea" && (
        <textarea
          disabled
          rows={4}
          placeholder={field.placeholder ?? ""}
          className="w-full px-3 py-2 rounded-[10px] border resize-none text-[13px] font-bold disabled:opacity-100"
          style={inputStyle}
        />
      )}
      {field.type === "text" && (
        <input
          disabled
          placeholder={field.placeholder ?? ""}
          className="h-10 px-3 rounded-[10px] border text-[13px] font-bold disabled:opacity-100"
          style={inputStyle}
        />
      )}
      {field.type === "number" && (
        <div className="flex items-center gap-2">
          <input
            disabled
            type="number"
            placeholder={field.placeholder ?? ""}
            className="flex-1 h-10 px-3 rounded-[10px] border text-[13px] font-bold disabled:opacity-100"
            style={inputStyle}
          />
          {field.unit && (
            <span
              className="px-2 h-10 rounded-[10px] inline-flex items-center text-[12px] font-extrabold"
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
          className="h-10 px-3 rounded-[10px] border text-[13px] font-bold disabled:opacity-100"
          style={inputStyle}
        />
      )}
      {field.type === "select" && (
        <select
          disabled
          className="h-10 px-3 rounded-[10px] border text-[13px] font-bold disabled:opacity-100"
          style={inputStyle}
        >
          <option>Seleccionar</option>
          {(field.options ?? []).map((option, index) => (
            <option key={index}>{option}</option>
          ))}
        </select>
      )}
      {field.type === "checkbox" && (
        <label
          className="h-10 px-3 rounded-[10px] border inline-flex items-center gap-2 text-[13px] font-bold"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-2)",
          }}
        >
          <input disabled type="checkbox" />
          {field.placeholder || "Marcar si aplica"}
        </label>
      )}
      {field.type === "checkboxes" && (
        <div className="flex flex-wrap gap-1.5">
          {(field.options ?? []).map((option, index) => (
            <label
              key={index}
              className="px-2.5 py-1.5 rounded-[9px] border inline-flex items-center gap-1.5 text-[12px] font-bold"
              style={{
                background: "var(--vet-bg-mid)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-2)",
              }}
            >
              <input disabled type="checkbox" />
              {option}
            </label>
          ))}
        </div>
      )}

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

function BlockPreview({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
}) {
  const options = field.options ?? [];

  if (field.type === "heading") {
    return (
      <input
        value={field.helpText ?? ""}
        onChange={(e) => onChange({ helpText: e.target.value })}
        placeholder="Subtítulo opcional"
        className="mt-1 w-full bg-transparent border-none outline-none text-[12px] font-semibold"
        style={{ color: "var(--vet-text-3)" }}
      />
    );
  }

  if (field.type === "select" || field.type === "checkboxes") {
    return (
      <OptionsChips
        options={options}
        onChange={(next) => onChange({ options: next })}
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <input
        value={field.placeholder ?? ""}
        onChange={(e) => onChange({ placeholder: e.target.value })}
        placeholder="Texto junto a la casilla"
        className="mt-2 w-full h-10 px-3 rounded-[10px] border outline-none text-[13px] font-bold"
        style={inputStyle}
      />
    );
  }

  return (
    <div className="mt-2 flex items-start gap-2">
      {field.type === "textarea" ? (
        <textarea
          value={field.placeholder ?? ""}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          placeholder="Escribe texto libre, instrucciones o la guía que verá el vet..."
          rows={3}
          className="flex-1 min-w-0 px-3 py-2 rounded-[10px] border outline-none text-[13px] font-bold resize-none"
          style={inputStyle}
        />
      ) : (
        <input
          value={field.placeholder ?? ""}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          placeholder={
            field.type === "number"
              ? "Ej. 12.5"
              : field.type === "date"
                ? "Fecha"
                : "Texto guía"
          }
          className="flex-1 min-w-0 h-10 px-3 rounded-[10px] border outline-none text-[13px] font-bold"
          style={inputStyle}
        />
      )}
      {field.type === "number" && (
        <input
          value={field.unit ?? ""}
          onChange={(e) => onChange({ unit: e.target.value })}
          placeholder="kg"
          className="w-20 h-10 px-2 rounded-[10px] border outline-none text-[13px] font-bold text-center"
          style={inputStyle}
        />
      )}
    </div>
  );
}

function OptionsChips({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {options.map((option, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 rounded-[9px] border px-2 py-1"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
          }}
        >
          <input
            value={option}
            onChange={(e) => {
              const next = [...options];
              next[index] = e.target.value;
              onChange(next);
            }}
            placeholder={`Opción ${index + 1}`}
            className="w-24 bg-transparent border-none outline-none text-[12px] font-bold"
            style={{ color: "var(--vet-text-1)" }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const next = [...options];
              next.splice(index, 1);
              onChange(next);
            }}
            className="w-5 h-5 rounded-full inline-flex items-center justify-center"
            style={{ color: "var(--vet-red)" }}
            aria-label="Eliminar opción"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange([...options, ""]);
        }}
        className="h-8 px-2 rounded-[9px] border border-dashed inline-flex items-center gap-1 text-[11px] font-extrabold"
        style={{
          background: "transparent",
          borderColor: "var(--vet-border)",
          color: "var(--vet-text-2)",
        }}
      >
        <Plus size={12} /> Opción
      </button>
    </div>
  );
}

function Inspector({
  selected,
  onChange,
  onDelete,
}: {
  selected: { section: FormSection; field: FormField } | null;
  onChange: (patch: Partial<FormField>) => void;
  onDelete: () => void;
}) {
  if (!selected) {
    return (
      <div
        className="rounded-[18px] border p-5"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
        }}
      >
        <p
          className="text-[13px] font-extrabold"
          style={{ color: "var(--vet-text-1)" }}
        >
          Selecciona un cuadro
        </p>
      </div>
    );
  }

  const field = selected.field;
  const visual = isVisualOnly(field.type);
  const needsOptions = fieldNeedsOptions(field.type);

  return (
    <div
      className="rounded-[18px] border overflow-hidden"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: "var(--vet-border)" }}
      >
        <Settings2 size={15} style={{ color: "var(--vet-green)" }} />
        <p
          className="text-[13px] font-black"
          style={{ color: "var(--vet-text-1)" }}
        >
          Cuadro
        </p>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <PanelField label="Tipo">
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(FIELD_TYPE_META) as FieldType[]).map((type) => {
              const active = type === field.type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChange({ type })}
                  className="h-9 rounded-[9px] border px-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold"
                  style={{
                    background: active
                      ? "color-mix(in oklab, var(--vet-green) 14%, transparent)"
                      : "var(--vet-bg-mid)",
                    borderColor: active ? "var(--vet-green)" : "var(--vet-border)",
                    color: active ? "var(--vet-green)" : "var(--vet-text-2)",
                  }}
                >
                  <span className="vet-mono">{FIELD_TYPE_META[type].icon}</span>
                  <span className="truncate">{FIELD_TYPE_META[type].label}</span>
                </button>
              );
            })}
          </div>
        </PanelField>

        {!visual && (
          <label
            className="h-10 rounded-[10px] border px-3 inline-flex items-center gap-2 cursor-pointer"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
            }}
          >
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) => onChange({ required: e.target.checked })}
            />
            <span
              className="text-[12px] font-extrabold"
              style={{ color: "var(--vet-text-1)" }}
            >
              Requerido
            </span>
          </label>
        )}

        {!visual && (
          <PanelField label="Ayuda">
            <textarea
              value={field.helpText ?? ""}
              onChange={(e) => onChange({ helpText: e.target.value })}
              rows={3}
              placeholder="Texto breve bajo el campo"
              className="w-full px-3 py-2 rounded-[10px] border outline-none resize-none text-[13px] font-bold"
              style={inputStyle}
            />
          </PanelField>
        )}

        {needsOptions && (
          <PanelField label="Opciones">
            <OptionsList
              options={field.options ?? []}
              onChange={(options) => onChange({ options })}
            />
          </PanelField>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="h-10 rounded-[10px] border inline-flex items-center justify-center gap-1.5 text-[12px] font-extrabold"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-red)",
          }}
        >
          <Trash2 size={14} /> Eliminar cuadro
        </button>
      </div>
    </div>
  );
}

function OptionsList({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <input
            value={option}
            onChange={(e) => {
              const next = [...options];
              next[index] = e.target.value;
              onChange(next);
            }}
            placeholder={`Opción ${index + 1}`}
            className="flex-1 min-w-0 h-9 px-3 rounded-[9px] border outline-none text-[12px] font-bold"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => {
              const next = [...options];
              next.splice(index, 1);
              onChange(next);
            }}
            className="w-9 h-9 rounded-[9px] border inline-flex items-center justify-center"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-red)",
            }}
            aria-label="Eliminar opción"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, ""])}
        className="self-start h-8 px-2.5 rounded-[8px] border border-dashed inline-flex items-center gap-1 text-[11px] font-extrabold"
        style={{
          background: "transparent",
          borderColor: "var(--vet-border)",
          color: "var(--vet-text-2)",
        }}
      >
        <Plus size={12} /> Agregar
      </button>
    </div>
  );
}

function TemplateMenu({
  onPick,
  onClose,
}: {
  onPick: (key: TemplateKey) => void;
  onClose: () => void;
}) {
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
      className="absolute top-full left-0 mt-1 z-30 w-[300px] rounded-[14px] border shadow-lg overflow-hidden"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        boxShadow: "0 14px 36px rgba(0,0,0,0.13)",
      }}
    >
      <div className="max-h-[60vh] overflow-y-auto p-1.5">
        {TEMPLATE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onPick(key)}
            className="w-full text-left rounded-[10px] px-3 py-2.5 flex items-start gap-2 transition-colors hover:[background:var(--vet-bg-hover)]"
          >
            <span className="text-[18px] leading-none mt-0.5">
              {TEMPLATE_META[key].icon}
            </span>
            <span className="min-w-0">
              <span
                className="block text-[13px] font-extrabold"
                style={{ color: "var(--vet-text-1)" }}
              >
                {TEMPLATE_META[key].label}
              </span>
              <span
                className="block text-[11px] font-semibold leading-snug"
                style={{ color: "var(--vet-text-3)" }}
              >
                {TEMPLATE_META[key].subtitle}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldTypeMenu({
  onPick,
  onClose,
}: {
  onPick: (type: FieldType) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-field-menu]")) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      data-field-menu
      className="absolute top-full left-0 mt-1 z-20 w-[280px] rounded-[14px] border shadow-lg p-1.5 grid grid-cols-2 gap-1"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        boxShadow: "0 14px 36px rgba(0,0,0,0.13)",
      }}
    >
      {(Object.keys(FIELD_TYPE_META) as FieldType[]).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onPick(type)}
          className="rounded-[10px] px-2 py-2 flex items-center gap-2 text-left hover:[background:var(--vet-bg-hover)]"
        >
          <span
            className="w-7 h-7 rounded-[8px] inline-flex items-center justify-center vet-mono text-[11px]"
            style={{
              background: "var(--vet-bg-mid)",
              color: "var(--vet-green)",
            }}
          >
            {FIELD_TYPE_META[type].icon}
          </span>
          <span className="min-w-0">
            <span
              className="block text-[12px] font-extrabold truncate"
              style={{ color: "var(--vet-text-1)" }}
            >
              {FIELD_TYPE_META[type].label}
            </span>
            <span
              className="block text-[10px] font-bold truncate"
              style={{ color: "var(--vet-text-3)" }}
            >
              {FIELD_TYPE_META[type].short}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

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
        <Loader2 size={12} className="animate-spin" /> Guardando
      </span>
    );
  }
  if (hasIssues) {
    return <span style={{ color: "var(--vet-text-3)" }}>Pausado</span>;
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
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{ color: "var(--vet-green)" }}
    >
      <Check size={12} /> Listo
    </span>
  );
}

function PanelField({
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

function createField(type: FieldType): FormField {
  return {
    id: newFieldId(),
    type,
    label:
      type === "heading"
        ? "Nuevo título"
        : type === "select"
          ? "Elegir opción"
          : type === "checkboxes"
            ? "Seleccionar elementos"
            : FIELD_TYPE_META[type].label,
    ...(fieldNeedsOptions(type) ? { options: ["Opción 1", "Opción 2"] } : {}),
    ...(type === "number" ? { unit: "kg" } : {}),
  };
}

function mergeField(prev: FormField, patch: Partial<FormField>): FormField {
  const next: FormField = { ...prev, ...patch };
  if (patch.type && patch.type !== prev.type) {
    if (fieldNeedsOptions(next.type)) {
      next.options =
        next.options && next.options.length > 0
          ? next.options
          : ["Opción 1", "Opción 2"];
    } else {
      delete next.options;
    }
    if (next.type !== "number") delete next.unit;
    if (isVisualOnly(next.type)) {
      delete next.required;
      delete next.placeholder;
    }
  }
  return next;
}

function ensureCanvasSchema(schema: FormSchema): FormSchema {
  if (schema.sections.length > 0) return schema;
  return {
    version: 1,
    sections: [{ id: newSectionId(), title: "Consulta", fields: [] }],
  };
}

function firstField(schema: FormSchema): Selection {
  const section = schema.sections.find((s) => s.fields.length > 0);
  if (!section) return null;
  return { sectionId: section.id, fieldId: section.fields[0].id };
}

type ValidationReport = {
  fieldsWithIssues: Set<string>;
};

function issuesFor(schema: FormSchema): ValidationReport {
  const fieldsWithIssues = new Set<string>();
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (!field.label.trim()) fieldsWithIssues.add(field.id);
      if (fieldNeedsOptions(field.type)) {
        const validOptions = (field.options ?? []).filter(
          (option) => option.trim().length > 0
        );
        if (validOptions.length === 0) fieldsWithIssues.add(field.id);
      }
    }
  }
  return { fieldsWithIssues };
}

function validateSchemaForSave(
  schema: FormSchema
): { ok: true } | { ok: false; reason: string } {
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (!field.label.trim()) {
        return { ok: false, reason: "Hay un campo sin etiqueta." };
      }
      if (fieldNeedsOptions(field.type)) {
        const validOptions = (field.options ?? []).filter(
          (option) => option.trim().length > 0
        );
        if (validOptions.length === 0) {
          return { ok: false, reason: "Hay un campo sin opciones." };
        }
      }
    }
  }
  return { ok: true };
}

const inputStyle = {
  background: "var(--vet-bg-card)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
} as const;
