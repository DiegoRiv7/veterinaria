import type { RecordField } from "@/components/PetRecordsTab";

/**
 * Catálogos y formularios de las secciones nuevas de la cartilla.
 * Los selects con `allowOther` muestran "Otro…" para capturar opciones
 * que no estén en el catálogo.
 */

export const LAB_KINDS = [
  "Químico sanguíneo",
  "Hemograma",
  "Patología",
  "Coprológico",
  "Coprocultivo",
  "Urianálisis",
];

export const TEST_NAMES = [
  "Moquillo canino",
  "Parvovirus canino",
  "Leucemia felina (FeLV)",
  "Sida felino (FIV)",
  "Ehrlichiosis",
];

export const TEST_RESULTS = ["Positivo", "Negativo", "Indeterminado"];

export const IMAGING_KINDS = [
  "Radiografía (rayos X)",
  "Ultrasonido / ecografía",
  "Ecocardiograma",
  "Tomografía (TAC)",
  "Endoscopía",
];

export const FOOD_TYPES = [
  "Croquetas (alimento seco)",
  "Alimento húmedo (latas/sobres)",
  "Mixta (seco + húmedo)",
  "Dieta BARF / natural",
  "Comida casera",
  "Dieta de prescripción",
];

export const LAB_FIELDS: RecordField[] = [
  { id: "kind", label: "Tipo de estudio", type: "select", options: LAB_KINDS, allowOther: true, required: true, full: true },
  { id: "performedAt", label: "Fecha", type: "date", required: true },
  { id: "result", label: "Resultado", type: "text", placeholder: "Normal, anemia leve…" },
  { id: "notes", label: "Notas", type: "textarea", placeholder: "Laboratorio externo, valores relevantes, seguimiento…" },
];

export const TEST_FIELDS: RecordField[] = [
  { id: "name", label: "Test", type: "select", options: TEST_NAMES, allowOther: true, required: true, full: true },
  { id: "performedAt", label: "Fecha", type: "date", required: true },
  { id: "result", label: "Resultado", type: "select", options: TEST_RESULTS },
  { id: "notes", label: "Notas", type: "textarea", placeholder: "Marca del test, observaciones…" },
];

export const IMAGING_FIELDS: RecordField[] = [
  { id: "kind", label: "Tipo de estudio", type: "select", options: IMAGING_KINDS, allowOther: true, required: true, full: true },
  { id: "region", label: "Zona estudiada", type: "text", placeholder: "Abdomen, tórax, cadera…" },
  { id: "performedAt", label: "Fecha", type: "date", required: true },
  { id: "findings", label: "Qué se le hizo / hallazgos", type: "textarea", placeholder: "Estudio realizado, hallazgos, interpretación…" },
];

export const FEEDING_FIELDS: RecordField[] = [
  { id: "foodType", label: "Tipo de alimento", type: "select", options: FOOD_TYPES, allowOther: true, required: true, full: true },
  { id: "brand", label: "Marca / producto", type: "text", placeholder: "Royal Canin, Hill's…" },
  { id: "weightKg", label: "Peso actual", type: "number", suffix: "kg", step: "0.1", placeholder: "12.5" },
  { id: "dailyGrams", label: "Cantidad al día", type: "number", suffix: "g", step: "1", placeholder: "320" },
  { id: "mealsPerDay", label: "Comidas al día", type: "number", step: "1", placeholder: "2" },
  { id: "recordedAt", label: "Fecha de registro", type: "date", required: true },
  { id: "notes", label: "Notas", type: "textarea", placeholder: "Indicaciones, premios, restricciones…" },
];
