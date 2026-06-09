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
    subtitle: "Biológico aplicado, lote, vía, próximas fechas.",
  },
  desparasitacion_interna: {
    label: "Desparasitación interna",
    icon: "💊",
    subtitle: "Producto, dosis, vía, próxima dosis.",
  },
  desparasitacion_externa: {
    label: "Desparasitación externa",
    icon: "🕷️",
    subtitle: "Producto, presentación, próxima aplicación.",
  },
  laboratorio: {
    label: "Laboratorio",
    icon: "🧪",
    subtitle: "Muestra, análisis, resultados.",
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
            title: "Historia clínica",
            fields: [
              {
                id: newFieldId(),
                label: "Anamnesis",
                type: "textarea",
                placeholder:
                  "Síntomas relatados por el cliente, tiempo de evolución, antecedentes.",
              },
              {
                id: newFieldId(),
                label: "Motivo de la visita",
                type: "text",
                placeholder: "Razón principal por la que vino el paciente.",
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Examen físico",
            fields: [
              {
                id: newFieldId(),
                label: "Peso",
                type: "number",
                unit: "kg",
              },
              {
                id: newFieldId(),
                label: "Temperatura",
                type: "number",
                unit: "°C",
              },
              {
                id: newFieldId(),
                label: "Frecuencia cardíaca",
                type: "number",
                unit: "lpm",
              },
              {
                id: newFieldId(),
                label: "Frecuencia respiratoria",
                type: "number",
                unit: "rpm",
              },
              {
                id: newFieldId(),
                label: "Hidratación",
                type: "select",
                options: ["Normal", "5%", "7%", "10%", "Severa"],
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Diagnóstico",
            fields: [
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Observaciones / hallazgos",
                type: "textarea",
                placeholder: "Hallazgos del examen físico, comportamiento.",
              },
              {
                id: newFieldId(),
                label: "Diagnósticos diferenciales",
                type: "textarea",
                placeholder: "Lista de posibles diagnósticos a descartar.",
              },
              {
                id: newFieldId(),
                label: "Diagnóstico definitivo",
                type: "text",
              },
              {
                id: newFieldId(),
                label: "Estudios solicitados",
                type: "checkboxes",
                options: [
                  "BHC",
                  "Química sanguínea",
                  "Urianálisis",
                  "Coproparasitoscópico",
                  "Radiografía",
                  "Ultrasonido",
                  "Cultivo",
                ],
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Tratamiento",
            fields: [
              {
                id: LEGACY_FIELD_IDS.medications,
                label: "Medicamentos / receta",
                type: "textarea",
                placeholder: "Fármaco, dosis, vía, frecuencia, duración.",
              },
              {
                id: LEGACY_FIELD_IDS.instructions,
                label: "Indicaciones para el cliente",
                type: "textarea",
                placeholder: "Dieta, reposo, curaciones, próxima visita.",
              },
              {
                id: newFieldId(),
                label: "Próxima visita",
                type: "date",
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
            title: "Aplicación",
            fields: [
              {
                id: newFieldId(),
                label: "Biológico aplicado",
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
              },
              {
                id: newFieldId(),
                label: "Lote",
                type: "text",
                placeholder: "Número de lote del biológico.",
              },
              {
                id: newFieldId(),
                label: "Vía de administración",
                type: "select",
                options: ["Subcutánea", "Intramuscular", "Oral", "Intranasal"],
              },
              {
                id: newFieldId(),
                label: "Fecha de aplicación",
                type: "date",
                required: true,
              },
              {
                id: newFieldId(),
                label: "Fecha de vencimiento del biológico",
                type: "date",
              },
              {
                id: newFieldId(),
                label: "Próxima vacuna",
                type: "date",
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Observaciones",
            fields: [
              {
                id: newFieldId(),
                label: "Reacciones adversas",
                type: "checkboxes",
                options: [
                  "Ninguna",
                  "Letargo",
                  "Fiebre",
                  "Inflamación local",
                  "Vómito",
                  "Reacción alérgica",
                ],
              },
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Notas",
                type: "textarea",
                placeholder: "Comportamiento del paciente, observaciones.",
              },
              {
                id: LEGACY_FIELD_IDS.instructions,
                label: "Indicaciones para el cliente",
                type: "textarea",
                placeholder:
                  "Vigilar 24h, evitar baño 3 días, retorno si reacción.",
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
            title: "Aplicación",
            fields: [
              {
                id: newFieldId(),
                label: "Producto aplicado",
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
              },
              {
                id: newFieldId(),
                label: "Dosis",
                type: "text",
                placeholder: "Cantidad / peso (ej. 1 comp / 10 kg)",
              },
              {
                id: newFieldId(),
                label: "Vía",
                type: "select",
                options: ["Oral", "Inyectable"],
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
                label: "Próxima desparasitación",
                type: "date",
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Observaciones",
            fields: [
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Observaciones",
                type: "textarea",
              },
              {
                id: LEGACY_FIELD_IDS.instructions,
                label: "Indicaciones para el cliente",
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
            title: "Aplicación",
            fields: [
              {
                id: newFieldId(),
                label: "Producto aplicado",
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
              },
              {
                id: newFieldId(),
                label: "Presentación",
                type: "select",
                options: ["Pipeta", "Comprimido", "Collar", "Spray", "Champú"],
              },
              {
                id: newFieldId(),
                label: "Fecha de aplicación",
                type: "date",
                required: true,
              },
              {
                id: newFieldId(),
                label: "Duración del efecto / vencimiento",
                type: "date",
              },
              {
                id: newFieldId(),
                label: "Próxima aplicación",
                type: "date",
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Hallazgos",
            fields: [
              {
                id: newFieldId(),
                label: "Pulgas",
                type: "select",
                options: ["No", "Sí - leve", "Sí - moderada", "Sí - severa"],
              },
              {
                id: newFieldId(),
                label: "Garrapatas",
                type: "select",
                options: ["No", "Sí"],
              },
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Notas",
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
            title: "Muestra",
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
              },
              {
                id: newFieldId(),
                label: "Fecha de toma",
                type: "date",
                required: true,
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Estudios",
            fields: [
              {
                id: newFieldId(),
                label: "Tipo de análisis",
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
                ],
              },
              {
                id: newFieldId(),
                label: "Tests específicos",
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
                ],
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Resultados",
            fields: [
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Hallazgos / resultados",
                type: "textarea",
              },
              {
                id: LEGACY_FIELD_IDS.instructions,
                label: "Recomendaciones para el cliente",
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
            title: "Estudio",
            fields: [
              {
                id: newFieldId(),
                label: "Técnica",
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
              },
              {
                id: newFieldId(),
                label: "Zona / región estudiada",
                type: "text",
                placeholder: "Ej. Abdomen completo, tórax, cráneo, rodilla.",
              },
              {
                id: newFieldId(),
                label: "Fecha del estudio",
                type: "date",
                required: true,
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Interpretación",
            fields: [
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Observaciones / hallazgos",
                type: "textarea",
                placeholder: "Descripción de lo encontrado en las imágenes.",
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
              {
                id: LEGACY_FIELD_IDS.instructions,
                label: "Recomendaciones",
                type: "textarea",
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
            title: "Servicio realizado",
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
                ],
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
                ],
              },
              {
                id: newFieldId(),
                label: "Productos utilizados",
                type: "textarea",
                placeholder: "Shampoo, acondicionador, productos extra.",
              },
            ],
          },
          {
            id: newSectionId(),
            title: "Observaciones",
            fields: [
              {
                id: newFieldId(),
                label: "Personalidad observada",
                type: "checkboxes",
                options: [
                  "Tranquilo",
                  "Nervioso",
                  "Agresivo",
                  "Tímido",
                  "Juguetón",
                  "Cooperativo",
                ],
              },
              {
                id: newFieldId(),
                label: "Presenta pulgas",
                type: "select",
                options: ["No", "Sí"],
              },
              {
                id: newFieldId(),
                label: "Presenta garrapatas",
                type: "select",
                options: ["No", "Sí"],
              },
              {
                id: newFieldId(),
                label: "Lesiones en piel",
                type: "select",
                options: ["No", "Sí"],
              },
              {
                id: newFieldId(),
                label: "Descripción de hallazgos",
                type: "textarea",
                placeholder:
                  "Si hay pulgas, garrapatas o lesiones, describir aquí.",
              },
              {
                id: LEGACY_FIELD_IDS.vetNotes,
                label: "Notas adicionales",
                type: "textarea",
              },
            ],
          },
        ],
      };
  }
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
