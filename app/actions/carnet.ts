"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

/**
 * Guardado inline desde el carnet de vacunación (pasaporte digital).
 * Solo personal de la clínica puede escribir aquí — el carnet es un
 * documento clínico, aunque el dueño pueda consultarlo.
 */

export type CarnetSaveResult = { ok: true; id: string } | { ok: false; error: string };

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw || !raw.trim()) return null;
  // Los date pickers mandan "YYYY-MM-DD"; anclamos a mediodía para no
  // cambiar de día por zona horaria.
  const v = raw.trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function requireStaff() {
  const session = await requireSession();
  if (session.role !== "VET" && session.role !== "ADMIN") {
    throw new Error("Solo el personal de la clínica puede editar el carnet.");
  }
  return session;
}

function revalidateCarnet(petId: string) {
  revalidatePath(`/vet/pacientes/${petId}/carnet`);
  revalidatePath(`/vet/pacientes/${petId}/cartilla`);
  revalidatePath(`/vet/pacientes/${petId}`);
  revalidatePath("/salud/cartilla");
}

export async function saveCarnetVaccineAction(input: {
  id?: string | null;
  petId: string;
  name: string;
  appliedAt: string;
  nextAt?: string | null;
  weightKg?: number | null;
  notes?: string | null;
}): Promise<CarnetSaveResult> {
  let session;
  try {
    session = await requireStaff();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "FORBIDDEN" };
  }

  const petId = (input.petId ?? "").trim();
  const name = (input.name ?? "").trim();
  const appliedAt = parseDate(input.appliedAt);
  const nextAt = parseDate(input.nextAt ?? null);
  const weightKg =
    typeof input.weightKg === "number" && Number.isFinite(input.weightKg) && input.weightKg > 0
      ? input.weightKg
      : null;
  const notes = (input.notes ?? "").trim() || null;

  if (!petId) return { ok: false, error: "Mascota inválida." };
  if (!name) return { ok: false, error: "Selecciona la vacuna." };
  if (!appliedAt) return { ok: false, error: "Selecciona la fecha de aplicación." };

  const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { id: true } });
  if (!pet) return { ok: false, error: "Mascota no encontrada." };

  const id = (input.id ?? "").trim();
  if (id) {
    const existing = await prisma.vaccine.findUnique({ where: { id }, select: { petId: true } });
    if (!existing || existing.petId !== petId) {
      return { ok: false, error: "Registro no encontrado." };
    }
    await prisma.vaccine.update({
      where: { id },
      data: { name, appliedAt, nextAt, weightKg, notes },
    });
    revalidateCarnet(petId);
    return { ok: true, id };
  }

  const created = await prisma.vaccine.create({
    data: {
      petId,
      name,
      appliedAt,
      nextAt,
      weightKg,
      notes,
      addedByUserId: session.userId,
    },
    select: { id: true },
  });
  revalidateCarnet(petId);
  return { ok: true, id: created.id };
}

export async function saveCarnetDewormingAction(input: {
  id?: string | null;
  petId: string;
  product: string;
  kind?: string | null;
  appliedAt: string;
  nextAt?: string | null;
  notes?: string | null;
}): Promise<CarnetSaveResult> {
  let session;
  try {
    session = await requireStaff();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "FORBIDDEN" };
  }

  const petId = (input.petId ?? "").trim();
  const product = (input.product ?? "").trim();
  const kindRaw = (input.kind ?? "").trim();
  const kind = ["Interna", "Externa", "Ambas"].includes(kindRaw) ? kindRaw : null;
  const appliedAt = parseDate(input.appliedAt);
  const nextAt = parseDate(input.nextAt ?? null);
  const notes = (input.notes ?? "").trim() || null;

  if (!petId) return { ok: false, error: "Mascota inválida." };
  if (!product) return { ok: false, error: "Selecciona el producto." };
  if (!appliedAt) return { ok: false, error: "Selecciona la fecha de aplicación." };

  const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { id: true } });
  if (!pet) return { ok: false, error: "Mascota no encontrada." };

  const id = (input.id ?? "").trim();
  if (id) {
    const existing = await prisma.deworming.findUnique({ where: { id }, select: { petId: true } });
    if (!existing || existing.petId !== petId) {
      return { ok: false, error: "Registro no encontrado." };
    }
    await prisma.deworming.update({
      where: { id },
      data: { product, kind, appliedAt, nextAt, notes },
    });
    revalidateCarnet(petId);
    return { ok: true, id };
  }

  const created = await prisma.deworming.create({
    data: {
      petId,
      product,
      kind,
      appliedAt,
      nextAt,
      notes,
      addedByUserId: session.userId,
    },
    select: { id: true },
  });
  revalidateCarnet(petId);
  return { ok: true, id: created.id };
}
