"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FancySelect, VET_TOKENS } from "@/components/FancySelect";
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
  Save,
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
  text: { label: "Respuesta corta", icon: "T", short: "Nombre, lote, resultado" },
  textarea: { label: "Nota clínica", icon: "¶", short: "Observaciones libres" },
  number: { label: "Dato numérico", icon: "#", short: "Peso, temperatura, dosis" },
  select: { label: "Elegir una opción", icon: "▾", short: "Normal, leve, grave" },
  checkbox: { label: "Sí / No", icon: "✓", short: "Marcar si aplica" },
  checkboxes: { label: "Lista para marcar", icon: "☑", short: "Varias opciones" },
  date: { label: "Fecha", icon: "D", short: "Próxima visita o aplicación" },
  heading: { label: "Título de sección", icon: "H", short: "Separar la hoja" },
};

type Selection = { sectionId: string; fieldId: string } | null;
type DragPayload = { kind: "existing"; sectionId: string; fieldId: string };
type ConfirmAction =
  | { kind: "template"; key: TemplateKey }
  | { kind: "section"; sectionId: string; title: string }
  | { kind: "field"; sectionId: string; fieldId: string; title: string };

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
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

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
    const next = ensureCanvasSchema(templateFor(key));
    mutate(() => next);
    setSelection(firstField(next));
    toast.success(`Plantilla "${TEMPLATE_META[key].label}" aplicada`);
  }

  function addSection() {
    const section: FormSection = {
      id: newSectionId(),
      title: "Nueva sección",
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

  function addNoteBlock(sectionId: string) {
    const field = createField("textarea");
    field.label = "";
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

  function addFieldAfter(sectionId: string, fieldId: string) {
    const field = createField("textarea");
    field.label = "";
    field.placeholder = "Escribe aquí...";
    mutate((s) => ({
      ...s,
      sections: s.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const index = section.fields.findIndex((item) => item.id === fieldId);
        const fields = [...section.fields];
        fields.splice(index >= 0 ? index + 1 : fields.length, 0, field);
        return { ...section, fields };
      }),
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

  function confirmPendingAction() {
    if (!confirmAction) return;
    if (confirmAction.kind === "template") {
      applyTemplate(confirmAction.key);
    } else if (confirmAction.kind === "section") {
      deleteSection(confirmAction.sectionId);
      toast.success("Grupo eliminado");
    } else {
      deleteField(confirmAction.sectionId, confirmAction.fieldId);
      toast.success("Cuadro eliminado");
    }
    setConfirmAction(null);
  }

  function placeField(
    from: DragPayload,
    to: { sectionId: string; index: number }
  ) {
    mutate((s) => {
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

  return (
    <div className="flex flex-col gap-3">
      <main className="min-w-0 flex flex-col gap-3">
        <div
          className="rounded-[18px] border overflow-hidden"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
          }}
        >
          <div
            className="px-3 py-2.5 border-b flex items-center justify-between gap-3 flex-wrap"
            style={{ borderColor: "var(--vet-border)" }}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTemplateOpen((open) => !open)}
                  className="h-9 px-3 rounded-[10px] border inline-flex items-center gap-2 text-[12px] font-extrabold"
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
                    onPick={(key) => {
                      setTemplateOpen(false);
                      setConfirmAction({ kind: "template", key });
                    }}
                    onClose={() => setTemplateOpen(false)}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={addSection}
                className="h-9 px-3 rounded-[10px] border border-dashed inline-flex items-center gap-2 text-[12px] font-extrabold"
                style={{
                  background: "transparent",
                  borderColor: "var(--vet-green)",
                  color: "var(--vet-green)",
                }}
              >
                <Plus size={14} /> Sección
              </button>
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
                  { value: "edit" as const, label: "Hoja", icon: Plus },
                  { value: "preview" as const, label: "Vista real", icon: Eye },
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
          {mode === "edit" && selected && (
            <div
              className="px-3 py-2 border-t"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
              }}
            >
              <ContextToolbar
                field={selected.field}
                onChange={(patch) =>
                  updateField(selected.section.id, selected.field.id, patch)
                }
                onDuplicate={() =>
                  duplicateField(selected.section.id, selected.field.id)
                }
                onDelete={() =>
                  setConfirmAction({
                    kind: "field",
                    sectionId: selected.section.id,
                    fieldId: selected.field.id,
                    title: selected.field.label || "Cuadro sin título",
                  })
                }
              />
            </div>
          )}
        </div>

        <div
          className="rounded-[22px] border p-2 sm:p-4"
          style={{
            background:
              "linear-gradient(180deg, var(--vet-bg-mid), var(--vet-bg-deep))",
            borderColor: "var(--vet-border)",
          }}
        >
          <div
            className="mx-auto w-full max-w-[1040px] min-h-[640px] rounded-[20px] border p-4 sm:p-8 flex flex-col gap-5"
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
                  onDeleteSection={() =>
                    setConfirmAction({
                      kind: "section",
                      sectionId: section.id,
                      title: section.title || "Grupo sin título",
                    })
                  }
                  onAddNote={() => addNoteBlock(section.id)}
                  onAddAfter={(fieldId) => addFieldAfter(section.id, fieldId)}
                  onUpdateField={(fieldId, patch) =>
                    updateField(section.id, fieldId, patch)
                  }
                  onDuplicateField={(fieldId) =>
                    duplicateField(section.id, fieldId)
                  }
                  onDeleteField={(fieldId) => {
                    const field = section.fields.find((item) => item.id === fieldId);
                    setConfirmAction({
                      kind: "field",
                      sectionId: section.id,
                      fieldId,
                      title: field?.label || "Cuadro sin título",
                    });
                  }}
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

      {confirmAction && (
        <ConfirmWidget
          action={confirmAction}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmPendingAction}
        />
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
  onAddNote,
  onAddAfter,
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
  onAddNote: () => void;
  onAddAfter: (fieldId: string) => void;
  onUpdateField: (fieldId: string, patch: Partial<FormField>) => void;
  onDuplicateField: (fieldId: string) => void;
  onDeleteField: (fieldId: string) => void;
  onDragStart: (fieldId: string) => void;
  onDragEnd: () => void;
  onDropAt: (index: number) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={section.title ?? ""}
          onChange={(e) => onSectionTitle(e.target.value)}
          placeholder="Título de la sección"
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
            onAddAfter={() => onAddAfter(field.id)}
            onDragStart={() => onDragStart(field.id)}
            onDragEnd={onDragEnd}
            onDrop={(after) => onDropAt(index + (after ? 1 : 0))}
            dragging={!!dragging}
          />
        </div>
      ))}

      {section.fields.length === 0 && (
        <div
          onClick={onAddNote}
          onDragOver={(e) => {
            if (!dragging) return;
            e.preventDefault();
          }}
          onDrop={(e) => {
            if (!dragging) return;
            e.preventDefault();
            onDropAt(0);
          }}
          className="border border-dashed rounded-[14px] p-6 text-center cursor-text"
          style={{
            borderColor: dragging ? "var(--vet-green)" : "var(--vet-border)",
            background: dragging
              ? "color-mix(in oklab, var(--vet-green) 8%, transparent)"
              : "transparent",
            color: dragging ? "var(--vet-green)" : "var(--vet-text-3)",
          }}
        >
          <p className="text-[12px] font-bold">
            {dragging ? "Suelta aquí" : "Haz clic aquí y empieza a escribir"}
          </p>
        </div>
      )}

      <div
        onClick={onAddNote}
        className="h-12 rounded-[12px] border border-dashed flex items-center px-4 cursor-text transition-colors"
        style={{
          background: "transparent",
          borderColor: "var(--vet-border)",
          color: "var(--vet-text-3)",
        }}
      >
        <span className="text-[13px] font-bold">
          Haz clic para escribir una nueva línea
        </span>
      </div>
    </section>
  );
}

function ContextToolbar({
  field,
  onChange,
  onDuplicate,
  onDelete,
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const visual = isVisualOnly(field.type);
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto"
      style={{
        color: "var(--vet-text-1)",
      }}
    >
      <span
        className="text-[10px] font-extrabold uppercase tracking-wider flex-shrink-0"
        style={{ color: "var(--vet-text-3)" }}
      >
        Seleccionado
      </span>

      <FancySelect
        value={field.type}
        onChange={(v) => onChange({ type: v as FieldType })}
        required
        options={(Object.keys(FIELD_TYPE_META) as FieldType[]).map((type) => ({
          value: type,
          label: FIELD_TYPE_META[type].label,
        }))}
        height={36}
        fontSize={12}
        radius={9}
        accent="var(--vet-green)"
        tokens={VET_TOKENS}
        className="w-[180px] shrink-0"
      />

      {!visual && (
        <label
          className="h-9 px-2.5 rounded-[9px] border inline-flex items-center gap-1.5 text-[11px] font-extrabold flex-shrink-0"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-2)",
          }}
        >
          <input
            type="checkbox"
            checked={!!field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          Obligatorio
        </label>
      )}

      <input
        value={field.helpText ?? ""}
        onChange={(e) => onChange({ helpText: e.target.value })}
        placeholder="Nota para quien atiende"
        className="min-w-[180px] flex-1 h-9 px-2 rounded-[9px] border text-[12px] font-bold outline-none"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          color: "var(--vet-text-1)",
        }}
      />

      <button
        type="button"
        onClick={onDuplicate}
        className="h-9 px-2.5 rounded-[9px] border inline-flex items-center gap-1.5 text-[11px] font-extrabold flex-shrink-0"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          color: "var(--vet-text-2)",
        }}
      >
        <Copy size={13} /> Duplicar
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="h-9 px-2.5 rounded-[9px] border inline-flex items-center gap-1.5 text-[11px] font-extrabold flex-shrink-0"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          color: "var(--vet-red)",
        }}
      >
        <Trash2 size={13} /> Quitar
      </button>
    </div>
  );
}

function ConfirmWidget({
  action,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isTemplate = action.kind === "template";
  const title = isTemplate
    ? `Aplicar plantilla "${TEMPLATE_META[action.key].label}"`
    : action.kind === "section"
      ? `Eliminar "${action.title}"`
      : `Eliminar "${action.title}"`;
  const body = isTemplate
    ? "La plantilla reemplazará el lienzo actual."
    : action.kind === "section"
      ? "También se eliminarán todos los cuadros dentro de este grupo."
      : "Este cuadro se quitará del formulario.";
  const confirmLabel = isTemplate ? "Aplicar plantilla" : "Eliminar";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(45, 25, 15, 0.34)" }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[360px] rounded-[18px] border p-4 shadow-xl"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          boxShadow: "0 22px 60px rgba(60, 35, 20, 0.22)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-[12px] inline-flex items-center justify-center flex-shrink-0"
            style={{
              background: isTemplate
                ? "var(--vet-green-glow)"
                : "color-mix(in oklab, var(--vet-red) 12%, transparent)",
              color: isTemplate ? "var(--vet-green)" : "var(--vet-red)",
            }}
          >
            {isTemplate ? <Layers size={17} /> : <Trash2 size={17} />}
          </div>
          <div className="min-w-0">
            <p
              className="text-[15px] font-black leading-tight"
              style={{ color: "var(--vet-text-1)" }}
            >
              {title}
            </p>
            <p
              className="text-[12px] font-semibold mt-1 leading-snug"
              style={{ color: "var(--vet-text-3)" }}
            >
              {body}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-3 rounded-[10px] border text-[12px] font-extrabold"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 px-3 rounded-[10px] text-[12px] font-extrabold text-white"
            style={{
              background: isTemplate
                ? "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))"
                : "linear-gradient(135deg, var(--vet-red), color-mix(in oklab, var(--vet-red) 70%, black))",
              boxShadow: isTemplate ? "0 8px 18px var(--vet-green-glow)" : "none",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
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
  onAddAfter,
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
  onAddAfter: () => void;
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
          : dragging
            ? "color-mix(in oklab, var(--vet-green) 45%, var(--vet-border))"
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
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              onAddAfter();
            }}
            autoFocus={selected && !field.label}
            placeholder={visual ? "Título" : "Qué debe llenar el vet"}
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
      {dragging && (
        <div
          className="mt-3 h-1 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--vet-green), transparent)",
            opacity: 0.55,
          }}
        />
      )}
    </article>
  );
}

function ConsultaPreview({ schema }: { schema: FormSchema }) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className="rounded-[16px] border p-4 flex items-center justify-between gap-3"
        style={{
          background: "var(--vet-bg-mid)",
          borderColor: "var(--vet-border)",
        }}
      >
        <div>
          <p
            className="text-[11px] font-extrabold uppercase tracking-wider"
            style={{ color: "var(--vet-text-3)" }}
          >
            Consulta
          </p>
          <p
            className="text-[18px] font-black"
            style={{ color: "var(--vet-text-1)" }}
          >
            Formato de atención
          </p>
        </div>
        <span
          className="text-[11px] font-extrabold px-2 py-1 rounded-full"
          style={{
            background: "var(--vet-green-glow)",
            color: "var(--vet-green)",
          }}
        >
          Vista real
        </span>
      </div>
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
        <div className="pointer-events-none">
          <FancySelect
            value=""
            onChange={() => {}}
            placeholder="Seleccionar"
            options={(field.options ?? []).map((option) => ({
              value: option,
              label: option,
            }))}
            height={40}
            fontSize={13}
            radius={10}
            accent="var(--vet-green)"
            tokens={VET_TOKENS}
          />
        </div>
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

function createField(type: FieldType): FormField {
  const labels: Record<FieldType, string> = {
    textarea: "Observaciones",
    text: "Dato importante",
    number: "Valor",
    select: "Estado",
    checkbox: "Aplica",
    checkboxes: "Hallazgos",
    date: "Fecha",
    heading: "Nueva sección",
  };
  return {
    id: newFieldId(),
    type,
    label: labels[type],
    ...(fieldNeedsOptions(type)
      ? { options: type === "select" ? ["Normal", "Leve", "Grave"] : ["Piel", "Pelaje", "Oídos"] }
      : {}),
    ...(type === "number" ? { unit: "kg" } : {}),
    ...(type === "textarea" ? { placeholder: "Escribe aquí..." } : {}),
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
