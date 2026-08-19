"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

/**
 * Registros de salud de la cartilla: laboratorio, tests de diagnóstico,
 * imagenología y alimentación. Mismo modelo de permisos que las vacunas:
 * el dueño de la mascota o el personal de la clínica pueden capturar.
 */

export type HealthRecordResult = { ok: true; id: string } | { ok: false; error: string };

function parseDate(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const v = raw.trim();
  // Los date pickers mandan "YYYY-MM-DD"; anclamos a mediodía para no
  // cambiar de día por zona horaria.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function text(fd: FormData, key: string, max = 200): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v ? v.slice(0, max) : null;
}

function positiveNumber(fd: FormData, key: string): number | null {
  const raw = String(fd.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function ensurePetAccess(petId: string, userId: string, role: string) {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { ownerId: true },
  });
  if (!pet) throw new Error("Mascota no encontrada.");
  const isOwner = pet.ownerId === userId;
  const isStaff = role === "VET" || role === "ADMIN";
  if (!isOwner && !isStaff) throw new Error("FORBIDDEN");
}

function revalidateCartilla(petId: string) {
  revalidatePath(`/vet/pacientes/${petId}/cartilla`);
  revalidatePath(`/vet/pacientes/${petId}`);
  revalidatePath(`/mascotas/${petId}`);
  revalidatePath("/salud/cartilla");
}

type Prepared =
  | { ok: true; petId: string; userId: string }
  | { ok: false; error: string };

async function prepare(fd: FormData): Promise<Prepared> {
  const session = await requireSession();
  const petId = String(fd.get("petId") ?? "").trim();
  if (!petId) return { ok: false, error: "Mascota inválida." };
  try {
    await ensurePetAccess(petId, session.userId, session.role);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "FORBIDDEN" };
  }
  return { ok: true, petId, userId: session.userId };
}

/* ─── Laboratorio ─────────────────────────────────────────────── */

export async function addLabStudyAction(
  _prev: unknown,
  fd: FormData
): Promise<HealthRecordResult> {
  const p = await prepare(fd);
  if (!p.ok) return p;
  const kind = text(fd, "kind", 80);
  const performedAt = parseDate(fd.get("performedAt"));
  if (!kind) return { ok: false, error: "Selecciona el tipo de estudio." };
  if (!performedAt) return { ok: false, error: "Pon la fecha del estudio." };

  const created = await prisma.labStudy.create({
    data: {
      petId: p.petId,
      kind,
      performedAt,
      result: text(fd, "result", 400),
      notes: text(fd, "notes", 600),
      addedByUserId: p.userId,
    },
    select: { id: true },
  });
  revalidateCartilla(p.petId);
  return { ok: true, id: created.id };
}

export async function deleteLabStudyAction(id: string): Promise<void> {
  await deleteRecord("labStudy", id);
}

/* ─── Tests de diagnóstico ────────────────────────────────────── */

const TEST_RESULTS = new Set(["Positivo", "Negativo", "Indeterminado"]);

export async function addDiagnosticTestAction(
  _prev: unknown,
  fd: FormData
): Promise<HealthRecordResult> {
  const p = await prepare(fd);
  if (!p.ok) return p;
  const name = text(fd, "name", 80);
  const performedAt = parseDate(fd.get("performedAt"));
  const resultRaw = text(fd, "result", 40);
  if (!name) return { ok: false, error: "Selecciona el test." };
  if (!performedAt) return { ok: false, error: "Pon la fecha del test." };

  const created = await prisma.diagnosticTest.create({
    data: {
      petId: p.petId,
      name,
      performedAt,
      result: resultRaw && TEST_RESULTS.has(resultRaw) ? resultRaw : null,
      notes: text(fd, "notes", 600),
      addedByUserId: p.userId,
    },
    select: { id: true },
  });
  revalidateCartilla(p.petId);
  return { ok: true, id: created.id };
}

export async function deleteDiagnosticTestAction(id: string): Promise<void> {
  await deleteRecord("diagnosticTest", id);
}

/* ─── Imagenología ────────────────────────────────────────────── */

export async function addImagingStudyAction(
  _prev: unknown,
  fd: FormData
): Promise<HealthRecordResult> {
  const p = await prepare(fd);
  if (!p.ok) return p;
  const kind = text(fd, "kind", 80);
  const performedAt = parseDate(fd.get("performedAt"));
  if (!kind) return { ok: false, error: "Selecciona el tipo de estudio." };
  if (!performedAt) return { ok: false, error: "Pon la fecha del estudio." };

  const created = await prisma.imagingStudy.create({
    data: {
      petId: p.petId,
      kind,
      region: text(fd, "region", 120),
      performedAt,
      findings: text(fd, "findings", 600),
      addedByUserId: p.userId,
    },
    select: { id: true },
  });
  revalidateCartilla(p.petId);
  return { ok: true, id: created.id };
}

export async function deleteImagingStudyAction(id: string): Promise<void> {
  await deleteRecord("imagingStudy", id);
}

/* ─── Alimentación ────────────────────────────────────────────── */

export async function addFeedingRecordAction(
  _prev: unknown,
  fd: FormData
): Promise<HealthRecordResult> {
  const p = await prepare(fd);
  if (!p.ok) return p;
  const foodType = text(fd, "foodType", 80);
  const recordedAt = parseDate(fd.get("recordedAt")) ?? new Date();
  if (!foodType) return { ok: false, error: "Selecciona el tipo de alimento." };

  const mealsPerDay = positiveNumber(fd, "mealsPerDay");

  const created = await prisma.feedingRecord.create({
    data: {
      petId: p.petId,
      foodType,
      brand: text(fd, "brand", 120),
      dailyGrams: positiveNumber(fd, "dailyGrams"),
      mealsPerDay: mealsPerDay ? Math.round(mealsPerDay) : null,
      weightKg: positiveNumber(fd, "weightKg"),
      notes: text(fd, "notes", 600),
      recordedAt,
      addedByUserId: p.userId,
    },
    select: { id: true },
  });
  revalidateCartilla(p.petId);
  return { ok: true, id: created.id };
}

export async function deleteFeedingRecordAction(id: string): Promise<void> {
  await deleteRecord("feedingRecord", id);
}

/* ─── Borrado común ───────────────────────────────────────────── */

async function deleteRecord(
  model: "labStudy" | "diagnosticTest" | "imagingStudy" | "feedingRecord",
  rawId: string
): Promise<void> {
  const session = await requireSession();
  const id = (rawId ?? "").trim();
  if (!id) throw new Error("Datos inválidos.");

  // Los cuatro modelos comparten la misma forma para esta consulta.
  const delegate = prisma[model] as unknown as {
    findUnique(args: {
      where: { id: string };
      select: { petId: true; pet: { select: { ownerId: true } } };
    }): Promise<{ petId: string; pet: { ownerId: string } } | null>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };

  const record = await delegate.findUnique({
    where: { id },
    select: { petId: true, pet: { select: { ownerId: true } } },
  });
  if (!record) throw new Error("Registro no encontrado.");

  const isOwner = record.pet.ownerId === session.userId;
  const isStaff = session.role === "VET" || session.role === "ADMIN";
  if (!isOwner && !isStaff) throw new Error("FORBIDDEN");

  await delegate.delete({ where: { id } });
  revalidateCartilla(record.petId);
}
