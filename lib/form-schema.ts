/**
 * Per-service consultation form schema.
 *
 * Each Service stores a `formSchema` (JSON) that describes the fields the
 * veterinarian sees when filling out a consulta. Each Appointment stores
 * the filled values in `consultaData` (JSON), keyed by field id.
 *
 * The schema is intentionally simple — closer to Google Forms than to a
 * full block editor. v1 supports the field types below, which cover the
 * surface area the partnering vet asked for in his services document.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "checkboxes"
  | "date"
  | "heading";

export type FormField = {
  /** Stable cuid-like id used as the key inside consultaData. */
  id: string;
  /** Visible label above the field. "heading" type uses this as the title. */
  label: string;
  type: FieldType;
  required?: boolean;
  /** Helpful placeholder for inputs and textareas. */
  placeholder?: string;
  /** Short helper text shown below the field. */
  helpText?: string;
  /** For number inputs: trailing unit chip ("kg", "°C", "lpm"). */
  unit?: string;
  /** For select / checkboxes — admin-editable list of options. */
  options?: string[];
};

export type FormSection = {
  id: string;
  title?: string;
  fields: FormField[];
};

export type FormSchema = {
  /** Schema version so we can evolve without breaking saved appointments. */
  version: 1;
  sections: FormSection[];
};

export type ConsultaValue = string | number | boolean | string[] | null;
export type ConsultaData = Record<string, ConsultaValue>;

/* ─── Parse / validate ──────────────────────────────────────────── */

export function parseFormSchema(raw: string | null | undefined): FormSchema | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 1 &&
      Array.isArray(parsed.sections)
    ) {
      return parsed as FormSchema;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseConsultaData(raw: string | null | undefined): ConsultaData {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ConsultaData;
    }
    return {};
  } catch {
    return {};
  }
}

export function isEmptySchema(schema: FormSchema | null): boolean {
  if (!schema) return true;
  return schema.sections.every((s) => s.fields.length === 0);
}

/* ─── Defaults / templates ──────────────────────────────────────── */

/**
 * Stable ids for the legacy fields. These exact ids are used by the
 * default "Consulta general" template so that values written to the new
 * consultaData blob also feed the old vetNotes/instructions/medications/
 * clientNotes columns at save time (kept for the receta PDF and existing
 * UI that reads those columns directly).
 */
export const LEGACY_FIELD_IDS = {
  vetNotes: "vetNotes",
  instructions: "instructions",
  medications: "medications",
  clientNotes: "clientNotes",
} as const;

/**
 * Plain default schema for "Consulta general" — what every service falls
 * back to if it has no custom schema. Maps 1:1 to the legacy text columns
 * on Appointment so nothing breaks.
 */
export const DEFAULT_CONSULTA_SCHEMA: FormSchema = {
  version: 1,
  sections: [
    {
      id: "main",
      title: "Notas de la consulta",
      fields: [
        {
          id: LEGACY_FIELD_IDS.vetNotes,
          label: "Diagnóstico / observaciones",
          type: "textarea",
          placeholder: "Qué encontraste, hallazgos, comportamiento...",
        },
        {
          id: LEGACY_FIELD_IDS.instructions,
          label: "Indicaciones para el cliente",
          type: "textarea",
          placeholder: "Dieta, reposo, curaciones, próxima visita...",
        },
        {
          id: LEGACY_FIELD_IDS.medications,
          label: "Medicamentos / receta",
          type: "textarea",
          placeholder: "Medicamentos prescritos con dosis y frecuencia.",
        },
      ],
    },
  ],
};

/* ─── Helpers for the admin builder + the vet renderer ─────────── */

export function newFieldId(): string {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}

export function newSectionId(): string {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

/** Whether a field type renders multi-value (checkboxes) or scalar. */
export function isMultiValueField(t: FieldType): boolean {
  return t === "checkboxes";
}

/** Whether the field can have a list of options (select/checkboxes). */
export function fieldNeedsOptions(t: FieldType): boolean {
  return t === "select" || t === "checkboxes";
}

/** Whether the field is purely visual (no value to persist). */
export function isVisualOnly(t: FieldType): boolean {
  return t === "heading";
}

/* ─── Templates per service category / name ─────────────────────── */

/**
 * Pre-built templates loosely matching what the partnering vet described
 * in his services document. The admin can edit, duplicate or delete any
 * field after applying a template — these are starting points, not
 * frozen blueprints.
 */
export const TEMPLATE_KEYS = [
  "blank",
  "consulta",
  "vacunacion",
  "desparasitacion_interna",
  "desparasitacion_externa",
  "laboratorio",
  "imagenologia",
  "cirugia",
  "estetica",
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const TEMPLATE_META: Record<
  TemplateKey,
  { label: string; icon: string; subtitle: string }
> = {
  blank: {
    label: "En blanco",
    icon: "📄",
    subtitle: "Empezar desde cero — agrega tus propios campos.",
  },
  consulta: {
    label: "Consulta general",
    icon: "🩺",
    subtitle: "Anamnesis, examen físico, diagnóstico, tratamiento.",
  },
  vacunacion: {
    label: "Vacunación",
    icon: "💉",
    subtitle: "Biológico, aplicación, vencimiento y próxima vacuna.",
  },
  desparasitacion_interna: {
    label: "Desparasitación interna",
    icon: "💊",
    subtitle: "Producto, aplicación, vencimiento y próxima dosis.",
  },
  desparasitacion_externa: {
    label: "Desparasitación externa",
    icon: "🕷️",
    subtitle: "Producto, aplicación, vencimiento y próxima dosis.",
  },
  laboratorio: {
    label: "Laboratorio",
    icon: "🧪",
    subtitle: "Muestra, análisis clínico y tests.",
  },
  imagenologia: {
    label: "Imagenología",
    icon: "🩻",
    subtitle: "Técnica, hallazgos, diagnósticos.",
  },
  cirugia: {
    label: "Cirugía",
    icon: "🔪",
    subtitle: "Procedimiento, anestesia, post-operatorio.",
  },
  estetica: {
    label: "Estética",
    icon: "✂️",
    subtitle: "Tipo de servicio, baño, observaciones de piel y pelaje.",
  },
};

export function templateFor(key: TemplateKey): FormSchema {
  switch (key) {
    case "blank":
      return { version: 1, sections: [{ id: newSectionId(), fields: [] }] };

    case "consulta":
      return {
        version: 1,
        sections: [
          {
            id: newSectionId(),
            title: "Consulta",
            fields: [
              {
                id: newFieldId(),
                label: "Anamnesis",
                type: "textarea",
                placeholder:
                  "Síntomas relatados por el cliente, tiempo de evolución, antecedentes.",
              },
              {
                id: LEGACY_FIELD_IDS.instructions,
                label: "Indicaciones para el cliente",
                type: "textarea",
                placeholder: "Cuidados, dieta, reposo, señales de alarma o próxima visita.",
              },
              {
                id: LEGACY_FIELD_IDS.medications,
                label: "Medicamentos o receta",
                type: "textarea",
                placeholder: "Medicamento, dosis, vía, frecuencia y duración.",
              },
              {
                id: newFieldId(),
                label: "Estudios autorizados",
                type: "checkboxes",
                options: [
                  "BHC",
                  "Química sanguínea",
                  "Urianálisis",
                  "Coproparasitoscópico",
                  "Radiografía",
                  "Ultrasonido",
                  "Cultivo",
                  "Test rápido",
                  "Otro",
                ],
              },
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Observaciones",
                type: "textarea",
                placeholder: "Hallazgos, evolución y notas para expediente individual.",
              },
              {
                id: newFieldId(),
                label: "Diagnósticos diferenciales",
                type: "textarea",
                placeholder: "Posibles diagnósticos a descartar.",
              },
              {
                id: newFieldId(),
                label: "Diagnóstico definitivo",
                type: "text",
              },
            ],
          },
        ],
      };

    case "vacunacion":
      return {
        version: 1,
        sections: [
          {
            id: newSectionId(),
            title: "Vacunación",
            fields: [
              {
                id: newFieldId(),
                label: "Tipo de biológico",
                type: "select",
                required: true,
                options: [
                  "Pentavalente",
                  "Antirrábica",
                  "Triple felina",
                  "Leucemia felina",
                  "Bordetella (KC)",
                  "Influenza canina",
                  "Giardia",
                  "Otro",
                ],
                helpText: "La lista se puede editar para registrar nuevos biológicos.",
              },
              {
                id: newFieldId(),
                label: "Fecha de aplicación",
                type: "date",
                required: true,
              },
              {
                id: newFieldId(),
                label: "Fecha de vencimiento",
                type: "date",
              },
              {
                id: newFieldId(),
                label: "Fecha de próxima vacuna",
                type: "date",
              },
              {
                id: newFieldId(),
                label: "Agregar al carnet virtual",
                type: "checkbox",
                helpText: "Marcar si debe aparecer en el carnet descargable del cliente.",
              },
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Observaciones",
                type: "textarea",
              },
            ],
          },
        ],
      };

    case "desparasitacion_interna":
      return {
        version: 1,
        sections: [
          {
            id: newSectionId(),
            title: "Desparasitación interna",
            fields: [
              {
                id: newFieldId(),
                label: "Tipo de desparasitante",
                type: "select",
                required: true,
                options: [
                  "Drontal Plus",
                  "Milbemax",
                  "Endogard",
                  "Cestal Plus",
                  "Panacur (Fenbendazol)",
                  "Otro",
                ],
                helpText: "La lista se puede editar para registrar nuevos desparasitantes.",
              },
              {
                id: newFieldId(),
                label: "Fecha de aplicación",
                type: "date",
                required: true,
              },
              {
                id: newFieldId(),
                label: "Fecha de vencimiento del producto",
                type: "date",
              },
              {
                id: newFieldId(),
                label: "Fecha próxima de desparasitación",
                type: "date",
              },
              {
                id: newFieldId(),
                label: "Anexar al carnet de vacunas",
                type: "checkbox",
                helpText: "Marcar si esta aplicación debe anexarse al carnet.",
              },
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Observaciones",
                type: "textarea",
              },
            ],
          },
        ],
      };

    case "desparasitacion_externa":
      return {
        version: 1,
        sections: [
          {
            id: newSectionId(),
            title: "Desparasitación externa",
            fields: [
              {
                id: newFieldId(),
                label: "Tipo de desparasitante",
                type: "select",
                required: true,
                options: [
                  "Frontline Plus",
                  "Bravecto",
                  "NexGard",
                  "Advantix",
                  "Simparica",
                  "Otro",
                ],
                helpText: "La lista se puede editar para registrar nuevos productos.",
              },
              {
                id: newFieldId(),
                label: "Fecha de aplicación",
                type: "date",
                required: true,
              },
              {
                id: newFieldId(),
                label: "Fecha de vencimiento",
                type: "date",
              },
              {
                id: newFieldId(),
                label: "Fecha próxima de desparasitación externa",
                type: "date",
              },
              {
                id: newFieldId(),
                label: "Anexar al carnet de vacunación",
                type: "checkbox",
                helpText: "Marcar si esta aplicación debe anexarse al carnet.",
              },
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Observaciones",
                type: "textarea",
              },
            ],
          },
        ],
      };

    case "laboratorio":
      return {
        version: 1,
        sections: [
          {
            id: newSectionId(),
            title: "Laboratorio",
            fields: [
              {
                id: newFieldId(),
                label: "Tipo de muestra",
                type: "select",
                required: true,
                options: [
                  "Sangre",
                  "Orina",
                  "Heces",
                  "Hisopado",
                  "Biopsia",
                  "Líquido cefalorraquídeo",
                  "Otro",
                ],
                helpText: "La lista se puede editar para registrar nuevas muestras.",
              },
              {
                id: newFieldId(),
                label: "Tipo de análisis clínico",
                type: "checkboxes",
                options: [
                  "BHC (Biometría hemática completa)",
                  "Química sanguínea",
                  "Perfil hepático",
                  "Perfil renal",
                  "Urianálisis",
                  "Coproparasitoscópico",
                  "Citología",
                  "Cultivo + antibiograma",
                  "Otro",
                ],
                helpText: "La lista se puede editar para registrar nuevos estudios.",
              },
              {
                id: newFieldId(),
                label: "Tipo de test",
                type: "checkboxes",
                options: [
                  "Ehrlichia",
                  "Anaplasma",
                  "Leptospira",
                  "Moquillo",
                  "Parvovirus",
                  "FIV / FeLV",
                  "Dirofilaria",
                  "Giardia",
                  "Otro",
                ],
                helpText: "La lista se puede editar para registrar nuevos tests.",
              },
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Observaciones",
                type: "textarea",
              },
            ],
          },
        ],
      };

    case "imagenologia":
      return {
        version: 1,
        sections: [
          {
            id: newSectionId(),
            title: "Imagenología",
            fields: [
              {
                id: newFieldId(),
                label: "Tipo de técnica",
                type: "select",
                required: true,
                options: [
                  "Radiografía",
                  "Ultrasonido (ecografía)",
                  "Tomografía",
                  "Resonancia magnética",
                  "Endoscopia",
                  "Ecocardiografía",
                ],
                helpText: "La lista se puede editar para registrar nuevas técnicas.",
              },
              {
                id: newFieldId(),
                label: "Fecha del estudio",
                type: "date",
                required: true,
              },
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Observaciones",
                type: "textarea",
                placeholder: "Descripción de lo encontrado en el estudio.",
              },
              {
                id: newFieldId(),
                label: "Diagnósticos diferenciales",
                type: "textarea",
              },
              {
                id: newFieldId(),
                label: "Diagnóstico definitivo",
                type: "text",
              },
            ],
          },
        ],
      };

    case "cirugia":
      return {
        version: 1,
        sections: [
          {
            id: newSectionId(),
            title: "Procedimiento",
            fields: [
              {
                id: newFieldId(),
                label: "Nombre del procedimiento",
                type: "text",
                required: true,
              },
              {
                id: newFieldId(),
                label: "Anestesia utilizada",
                type: "select",
                options: [
                  "Local",
                  "Sedación",
                  "General inhalatoria",
                  "General intravenosa",
                ],
              },
              {
                id: newFieldId(),
                label: "Duración del procedimiento (min)",
                type: "number",
                unit: "min",
              },
              {
                id: newFieldId(),
                label: "Fecha de la cirugía",
                type: "date",
                required: true,
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Notas operatorias",
            fields: [
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Hallazgos y descripción del procedimiento",
                type: "textarea",
              },
              {
                id: newFieldId(),
                label: "Complicaciones",
                type: "textarea",
                placeholder: "Sólo si hubo. Dejar vacío si todo salió bien.",
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Post-operatorio",
            fields: [
              {
                id: LEGACY_FIELD_IDS.medications,
                label: "Medicamentos prescritos",
                type: "textarea",
              },
              {
                id: LEGACY_FIELD_IDS.instructions,
                label: "Cuidados para el cliente",
                type: "textarea",
                placeholder:
                  "Reposo, curación de herida, retirada de puntos, dieta.",
              },
              {
                id: newFieldId(),
                label: "Próxima revisión",
                type: "date",
              },
            ],
          },
        ],
      };

    case "estetica":
      return {
        version: 1,
        sections: [
          {
            id: newSectionId(),
            title: "Estética",
            fields: [
              {
                id: newFieldId(),
                label: "Tipo de servicio",
                type: "select",
                required: true,
                options: [
                  "Baño básico",
                  "Baño + corte higiénico",
                  "Corte de raza",
                  "Corte estilizado",
                  "Spa completo",
                  "Sólo corte de uñas",
                  "Otro",
                ],
                helpText: "La lista se puede editar para registrar nuevos tipos de servicio.",
              },
              {
                id: newFieldId(),
                label: "Baño dermatológico",
                type: "select",
                options: [
                  "No aplica",
                  "Antiseborreico",
                  "Antimicótico",
                  "Hidratante",
                  "Calmante",
                  "Antipulgas medicado",
                  "Otro",
                ],
                helpText: "La lista se puede editar para registrar nuevos baños dermatológicos.",
              },
              {
                id: newFieldId(),
                label: "Personalidad del perro",
                type: "checkboxes",
                options: [
                  "Tranquilo",
                  "Nervioso",
                  "Agresivo",
                  "Tímido",
                  "Juguetón",
                  "Cooperativo",
                  "Otro",
                ],
                helpText: "La lista se puede editar para registrar nuevas opciones.",
              },
              {
                id: newFieldId(),
                label: "Pulgas",
                type: "select",
                options: ["No", "Sí"],
              },
              {
                id: newFieldId(),
                label: "Garrapatas",
                type: "select",
                options: ["No", "Sí"],
              },
              {
                id: newFieldId(),
                label: "Lesiones de piel",
                type: "select",
                options: ["No", "Sí"],
              },
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Observaciones",
                type: "textarea",
                placeholder:
                  "Notas de la visita, productos usados o hallazgos de piel/pelaje.",
              },
            ],
          },
        ],
      };
  }
}

/* ─── Carnet de vacunación: extracción al completar la consulta ── */

/**
 * When a consulta is marked as attended and the vet checked the
 * "Agregar/Anexar al carnet" box, the answers are mirrored into the pet's
 * permanent records (Vaccine / Deworming) so they show up in the cartilla
 * and in the passport-style carnet de vacunación.
 *
 * Field ids are random per service, so fields are resolved by label —
 * the same labels the built-in templates use. Admin-customized forms keep
 * working as long as the relevant labels still contain the keywords below.
 */
export type CarnetEntry =
  | {
      kind: "vaccine";
      name: string;
      appliedAt: Date | null;
      nextAt: Date | null;
      weightKg: number | null;
      notes: string | null;
    }
  | {
      kind: "deworming";
      product: string;
      dewormKind: "Interna" | "Externa" | null;
      appliedAt: Date | null;
      nextAt: Date | null;
      notes: string | null;
    };

function parseDateValue(v: ConsultaValue | undefined): Date | null {
  if (typeof v !== "string" || !v.trim()) return null;
  // Date inputs produce "YYYY-MM-DD"; anchor at noon to avoid TZ day-shift.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v.trim())
    ? new Date(`${v.trim()}T12:00:00`)
    : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function extractCarnetEntry(
  schema: FormSchema | null,
  data: ConsultaData,
  serviceName: string
): CarnetEntry | null {
  if (!schema) return null;

  const fields = schema.sections.flatMap((s) => s.fields);
  const byLabel = (re: RegExp, types?: FieldType[]) =>
    fields.find(
      (f) => re.test(f.label) && (!types || types.includes(f.type))
    );
  const valueOf = (f: FormField | undefined): ConsultaValue | undefined =>
    f ? data[f.id] : undefined;

  // 1. The vet must have ticked the carnet checkbox.
  const carnetField = byLabel(/carnet/i, ["checkbox"]);
  if (!carnetField || data[carnetField.id] !== true) return null;

  // 2. Classify the service. Deworming first: its checkbox label also
  //    mentions "carnet de vacunas", so the service/section text decides.
  const haystack = [
    serviceName,
    ...schema.sections.map((s) => s.title ?? ""),
  ].join(" ");
  const isDeworm = /desparasit|antiparasit/i.test(haystack);
  const isVaccine = !isDeworm && /vacun|biol[óo]gico/i.test(haystack);
  if (!isDeworm && !isVaccine) return null;

  // 3. Product / biológico name.
  const nameField =
    byLabel(/biol[óo]gico|desparasitante|producto|vacuna/i, [
      "select",
      "text",
    ]) ?? fields.find((f) => f.type === "select" && typeof data[f.id] === "string");
  const nameValue = valueOf(nameField);
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  if (!name) return null;

  // 4. Dates, weight and notes.
  const appliedAt = parseDateValue(valueOf(byLabel(/aplicaci[óo]n/i, ["date"])));
  const nextAt = parseDateValue(valueOf(byLabel(/pr[óo]xim/i, ["date"])));
  const expiresAt = parseDateValue(valueOf(byLabel(/vencimiento/i, ["date"])));

  const weightRaw = valueOf(byLabel(/peso/i, ["number"]));
  const weightKg =
    typeof weightRaw === "number" && Number.isFinite(weightRaw)
      ? weightRaw
      : null;

  const notesRaw =
    valueOf(byLabel(/observacion/i, ["textarea", "text"])) ??
    data[LEGACY_FIELD_IDS.vetNotes];
  const notesParts: string[] = [];
  if (typeof notesRaw === "string" && notesRaw.trim())
    notesParts.push(notesRaw.trim());
  if (expiresAt)
    notesParts.push(
      `Vencimiento del producto: ${expiresAt.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`
    );
  const notes = notesParts.length > 0 ? notesParts.join("\n") : null;

  if (isDeworm) {
    const dewormKind = /extern/i.test(haystack)
      ? "Externa"
      : /intern/i.test(haystack)
        ? "Interna"
        : null;
    return { kind: "deworming", product: name, dewormKind, appliedAt, nextAt, notes };
  }
  return { kind: "vaccine", name, appliedAt, nextAt, weightKg, notes };
}

/* ─── Auto-pick a template based on the service name ───────────── */

export function templateKeyForServiceName(name: string): TemplateKey {
  const n = name.toLowerCase();
  if (/vacun/.test(n)) return "vacunacion";
  if (/desparasit.*intern|interna/.test(n)) return "desparasitacion_interna";
  if (/desparasit.*extern|externa|pulgas|garrapat/.test(n))
    return "desparasitacion_externa";
  if (/desparasit/.test(n)) return "desparasitacion_interna";
  if (/laborator|análisis|analisis|sangre|orina|coprolog|examen.*laborator/.test(n))
    return "laboratorio";
  if (/rayos.?x|radio|ultrasonid|ecograf|imagen|tomograf|resonan|endoscop/.test(n))
    return "imagenologia";
  if (/operaci|cirug|esteriliza|castra/.test(n)) return "cirugia";
  if (/est[ée]tica|baño|bano|corte|groom|peluquer|spa|uñas/.test(n))
    return "estetica";
  return "consulta";
}
