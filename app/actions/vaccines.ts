"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export type AddVaccineResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function parseDate(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
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
  return pet;
}

export async function addVaccineAction(
  _prev: unknown,
  formData: FormData
): Promise<AddVaccineResult> {
  const session = await requireSession();
  const petId = String(formData.get("petId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const applied = parseDate(formData.get("appliedAt"));
  const next = parseDate(formData.get("nextAt"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!petId) return { ok: false, error: "Mascota inválida." };
  if (!name) return { ok: false, error: "Pon el nombre de la vacuna." };
  if (!applied) return { ok: false, error: "Pon la fecha en que se aplicó." };

  try {
    await ensurePetAccess(petId, session.userId, session.role);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "FORBIDDEN" };
  }

  const created = await prisma.vaccine.create({
    data: {
      petId,
      name,
      appliedAt: applied,
      nextAt: next,
      notes,
      addedByUserId: session.userId,
    },
    select: { id: true },
  });

  revalidatePath(`/mascotas/${petId}`);
  revalidatePath(`/vet/pacientes/${petId}`);
  return { ok: true, id: created.id };
}

export async function deleteVaccineAction(vaccineId: string): Promise<void> {
  const session = await requireSession();
  const id = (vaccineId ?? "").trim();
  if (!id) throw new Error("Datos inválidos.");
  const vaccine = await prisma.vaccine.findUnique({
    where: { id },
    include: { pet: { select: { ownerId: true } } },
  });
  if (!vaccine) throw new Error("Vacuna no encontrada.");
  const isOwner = vaccine.pet.ownerId === session.userId;
  const isAdmin = session.role === "ADMIN";
  const isAdder = vaccine.addedByUserId === session.userId;
  if (!isOwner && !isAdmin && !isAdder) throw new Error("FORBIDDEN");

  await prisma.vaccine.delete({ where: { id } });
  revalidatePath(`/mascotas/${vaccine.petId}`);
  revalidatePath(`/vet/pacientes/${vaccine.petId}`);
}
