"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { requireSession } from "@/lib/auth";

/**
 * Edición de registros del expediente (vacunas, desparasitaciones,
 * cirugías, laboratorio, tests, imagenología, alimentación) con bitácora
 * por registro: cada campo cambiado se guarda (quién, qué, cuándo) y se
 * puede revertir individualmente.
 */

type FieldKind = "text" | "date" | "number" | "int";
type FieldSpec = { kind: FieldKind; required?: boolean; max?: number };

const RECORD_SPECS: Record<
  string,
  { delegate: string; fields: Record<string, FieldSpec> }
> = {
  vaccine: {
    delegate: "vaccine",
    fields: {
      name: { kind: "text", required: true, max: 80 },
      appliedAt: { kind: "date", required: true },
      nextAt: { kind: "date" },
      notes: { kind: "text", max: 500 },
      vetName: { kind: "text", max: 80 },
    },
  },
  deworming: {
    delegate: "deworming",
    fields: {
      product: { kind: "text", required: true, max: 80 },
      kind: { kind: "text", max: 30 },
      appliedAt: { kind: "date", required: true },
      nextAt: { kind: "date" },
      notes: { kind: "text", max: 500 },
      vetName: { kind: "text", max: 80 },
    },
  },
  surgery: {
    delegate: "surgery",
    fields: {
      name: { kind: "text", required: true, max: 100 },
      performedAt: { kind: "date", required: true },
      clinic: { kind: "text", max: 80 },
      notes: { kind: "text", max: 500 },
    },
  },
  lab: {
    delegate: "labStudy",
    fields: {
      kind: { kind: "text", required: true, max: 80 },
      performedAt: { kind: "date", required: true },
      result: { kind: "text", max: 200 },
      notes: { kind: "text", max: 500 },
      vetName: { kind: "text", max: 80 },
    },
  },
  test: {
    delegate: "diagnosticTest",
    fields: {
      name: { kind: "text", required: true, max: 80 },
      performedAt: { kind: "date", required: true },
      result: { kind: "text", max: 30 },
      notes: { kind: "text", max: 500 },
      vetName: { kind: "text", max: 80 },
    },
  },
  imaging: {
    delegate: "imagingStudy",
    fields: {
      kind: { kind: "text", required: true, max: 80 },
      region: { kind: "text", max: 80 },
      performedAt: { kind: "date", required: true },
      findings: { kind: "text", max: 800 },
      vetName: { kind: "text", max: 80 },
    },
  },
  feeding: {
    delegate: "feedingRecord",
    fields: {
      foodType: { kind: "text", required: true, max: 80 },
      brand: { kind: "text", max: 80 },
      weightKg: { kind: "number" },
      dailyGrams: { kind: "number" },
      mealsPerDay: { kind: "int" },
      recordedAt: { kind: "date", required: true },
      notes: { kind: "text", max: 500 },
    },
  },
};

type Delegate = {
  findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Prisma.PrismaPromise<unknown>;
};

function delegateFor(type: string): Delegate {
  const name = RECORD_SPECS[type].delegate;
  return (prisma as unknown as Record<string, Delegate>)[name];
}

function serialize(spec: FieldSpec, v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (spec.kind === "date") {
    const d = v as Date;
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  const s = String(v);
  return s.length > 0 ? s : null;
}

function parse(
  spec: FieldSpec,
  raw: string | null
): { ok: true; value: unknown } | { ok: false; error: string } {
  const v = (raw ?? "").trim();
  if (!v) {
    if (spec.required) return { ok: false, error: "Este campo es obligatorio." };
    return { ok: true, value: null };
  }
  switch (spec.kind) {
    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: "Fecha inválida." };
      const d = new Date(`${v}T12:00:00`);
      if (Number.isNaN(d.getTime())) return { ok: false, error: "Fecha inválida." };
      return { ok: true, value: d };
    }
    case "number": {
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0 || n > 99999)
        return { ok: false, error: "Número inválido." };
      return { ok: true, value: Math.round(n * 100) / 100 };
    }
    case "int": {
      const n = Math.round(Number(v));
      if (!Number.isFinite(n) || n <= 0 || n > 99)
        return { ok: false, error: "Número inválido." };
      return { ok: true, value: n };
    }
    case "text":
      return { ok: true, value: v.slice(0, spec.max ?? 200) };
  }
}

async function ensureAccess(petOwnerId: string) {
  const session = await requireSession();
  if (session.role !== "CLIENT") return session;
  if (session.userId === petOwnerId) return session;
  throw new Error("FORBIDDEN");
}

function revalidateCartilla(petId: string) {
  revalidatePath(`/vet/pacientes/${petId}/cartilla`);
  revalidatePath(`/vet/pacientes/${petId}/carnet`);
  revalidatePath(`/vet/pacientes/${petId}`);
  revalidatePath(`/mascotas/${petId}`);
  revalidatePath("/salud/cartilla");
}

export type RecordEditResult = { ok: true } | { ok: false; error: string };

/**
 * Actualiza campos de un registro del expediente. Cada campo que cambió
 * queda en la bitácora; sin cambios reales no se registra nada.
 */
export async function updateHealthRecordAction(input: {
  type: string;
  id: string;
  values: Record<string, string>;
}): Promise<RecordEditResult> {
  const spec = RECORD_SPECS[input.type];
  if (!spec) return { ok: false, error: "Tipo de registro inválido." };
  const id = (input.id ?? "").trim();
  if (!id) return { ok: false, error: "Registro inválido." };

  const record = await delegateFor(input.type).findUnique({ where: { id } });
  if (!record) return { ok: false, error: "Registro no encontrado." };
  const petId = record.petId as string;
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { ownerId: true },
  });
  if (!pet) return { ok: false, error: "Paciente no encontrado." };

  let session;
  try {
    session = await ensureAccess(pet.ownerId);
  } catch {
    return { ok: false, error: "No autorizado." };
  }

  const data: Record<string, unknown> = {};
  const logs: { field: string; oldValue: string | null; newValue: string | null }[] = [];
  for (const [field, fieldSpec] of Object.entries(spec.fields)) {
    if (!(field in input.values)) continue; // campo no enviado → sin cambio
    const parsed = parse(fieldSpec, input.values[field]);
    if (!parsed.ok) return { ok: false, error: `${field}: ${parsed.error}` };
    const oldSerialized = serialize(fieldSpec, record[field]);
    const newSerialized = serialize(fieldSpec, parsed.value);
    if (oldSerialized === newSerialized) continue;
    data[field] = parsed.value;
    logs.push({ field, oldValue: oldSerialized, newValue: newSerialized });
  }

  if (logs.length === 0) return { ok: true }; // nada cambió

  await prisma.$transaction([
    delegateFor(input.type).update({ where: { id }, data }),
    prisma.healthRecordChange.createMany({
      data: logs.map((l) => ({
        petId,
        recordType: input.type,
        recordId: id,
        field: l.field,
        oldValue: l.oldValue,
        newValue: l.newValue,
        changedById: session.userId,
      })),
    }),
  ]);

  revalidateCartilla(petId);
  return { ok: true };
}

/** Revierte un cambio de la bitácora de un registro del expediente. */
export async function revertHealthRecordChangeAction(
  changeId: string
): Promise<RecordEditResult> {
  const change = await prisma.healthRecordChange.findUnique({
    where: { id: (changeId ?? "").trim() },
    include: { pet: { select: { ownerId: true } } },
  });
  if (!change) return { ok: false, error: "Cambio no encontrado." };
  if (change.revertedAt) return { ok: false, error: "Este cambio ya fue revertido." };

  const spec = RECORD_SPECS[change.recordType];
  const fieldSpec = spec?.fields[change.field];
  if (!spec || !fieldSpec) return { ok: false, error: "Campo no reversible." };

  let session;
  try {
    session = await ensureAccess(change.pet.ownerId);
  } catch {
    return { ok: false, error: "No autorizado." };
  }

  const record = await delegateFor(change.recordType).findUnique({
    where: { id: change.recordId },
  });
  if (!record) return { ok: false, error: "El registro ya no existe." };

  const parsed = parse(fieldSpec, change.oldValue);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const currentSerialized = serialize(fieldSpec, record[change.field]);

  await prisma.$transaction([
    delegateFor(change.recordType).update({
      where: { id: change.recordId },
      data: { [change.field]: parsed.value },
    }),
    prisma.healthRecordChange.create({
      data: {
        petId: change.petId,
        recordType: change.recordType,
        recordId: change.recordId,
        field: change.field,
        oldValue: currentSerialized,
        newValue: change.oldValue,
        changedById: session.userId,
      },
    }),
    prisma.healthRecordChange.update({
      where: { id: change.id },
      data: { revertedAt: new Date() },
    }),
  ]);

  revalidateCartilla(change.petId);
  return { ok: true };
}
