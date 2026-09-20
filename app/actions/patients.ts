"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, requireSession } from "@/lib/auth";

/**
 * Alta de paciente desde el panel del vet, sin necesidad de agendar cita:
 * - mascota nueva para un cliente existente, o
 * - cliente nuevo + mascota nueva (mismas reglas que en "Nueva cita":
 *   si el teléfono ya existe se reutiliza ese cliente; si no, se crea con
 *   correo placeholder y contraseña aleatoria).
 */

const VALID_SPECIES = ["DOG", "CAT", "BIRD", "RABBIT", "HAMSTER", "REPTILE", "OTHER"] as const;
type Species = (typeof VALID_SPECIES)[number];

export type CreatePatientResult =
  | { ok: true; petId: string; petName: string }
  | { ok: false; error: string };

export async function createPatientByVetAction(
  _: unknown,
  formData: FormData
): Promise<CreatePatientResult> {
  const session = await requireSession();
  if (session.role !== "VET" && session.role !== "ADMIN") {
    return { ok: false, error: "No autorizado." };
  }

  const clientId = String(formData.get("clientId") ?? "").trim();
  const newClientName = String(formData.get("newClientName") ?? "").trim();
  const newClientPhone = String(formData.get("newClientPhone") ?? "").replace(/\D+/g, "");
  const petName = String(formData.get("petName") ?? "").trim();
  const petSpecies = String(formData.get("petSpecies") ?? "").trim();
  const petBreed = String(formData.get("petBreed") ?? "").trim() || null;

  if (!petName) return { ok: false, error: "Ingresa el nombre de la mascota." };
  if (!(VALID_SPECIES as readonly string[]).includes(petSpecies)) {
    return { ok: false, error: "Selecciona la especie." };
  }

  // Cliente: existente o nuevo (reutiliza por teléfono si ya está registrado)
  let ownerId = clientId;
  if (!ownerId) {
    if (!newClientName) return { ok: false, error: "Ingresa el nombre del cliente." };
    if (newClientPhone.length < 7) {
      return { ok: false, error: "Ingresa un teléfono válido (mín. 7 dígitos)." };
    }
    const byPhone = await prisma.user.findUnique({ where: { phone: newClientPhone } });
    if (byPhone) {
      if (byPhone.role !== "CLIENT") {
        return { ok: false, error: "Ese teléfono pertenece a personal de la clínica." };
      }
      ownerId = byPhone.id;
    } else {
      const placeholderEmail = `tel-${newClientPhone}@noemail.patitasfelices.com`;
      const passwordHash = await hashPassword(randomBytes(24).toString("hex"));
      const created = await prisma.user.create({
        data: {
          name: newClientName,
          phone: newClientPhone,
          email: placeholderEmail,
          passwordHash,
          role: "CLIENT",
        },
      });
      ownerId = created.id;
    }
  } else {
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { role: true } });
    if (!owner || owner.role !== "CLIENT") {
      return { ok: false, error: "Cliente no encontrado." };
    }
  }

  const pet = await prisma.pet.create({
    data: {
      ownerId,
      name: petName.slice(0, 60),
      species: petSpecies as Species,
      breed: petBreed ? petBreed.slice(0, 60) : null,
    },
    select: { id: true, name: true },
  });

  revalidatePath("/vet/pacientes");
  revalidatePath("/vet");
  return { ok: true, petId: pet.id, petName: pet.name };
}

/* ─── Edición de la ficha con bitácora ──────────────────────────── */

const EDITABLE_PET_FIELDS = [
  "birthDate",
  "species",
  "breed",
  "weightKg",
  "sex",
  "color",
  "sterilized",
  "microchipId",
] as const;
export type EditablePetField = (typeof EDITABLE_PET_FIELDS)[number];

const VALID_SEX = ["MALE", "FEMALE", "UNKNOWN"] as const;

/** Serializa el valor actual de Pet[field] al formato de la bitácora. */
function serializeField(field: EditablePetField, pet: Record<string, unknown>): string | null {
  const v = pet[field];
  if (v === null || v === undefined) return null;
  if (field === "birthDate") {
    const d = v as Date;
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  if (field === "sterilized") return v ? "true" : "false";
  return String(v);
}

/** Valida y convierte el valor serializado al tipo real de Pet[field]. */
function parseField(
  field: EditablePetField,
  raw: string | null
): { ok: true; value: unknown } | { ok: false; error: string } {
  const v = (raw ?? "").trim();
  switch (field) {
    case "birthDate": {
      if (!v) return { ok: true, value: null };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: "Fecha inválida." };
      const d = new Date(`${v}T12:00:00`);
      if (Number.isNaN(d.getTime())) return { ok: false, error: "Fecha inválida." };
      if (d.getTime() > Date.now()) return { ok: false, error: "La fecha no puede ser futura." };
      return { ok: true, value: d };
    }
    case "species":
      if (!(VALID_SPECIES as readonly string[]).includes(v))
        return { ok: false, error: "Especie inválida." };
      return { ok: true, value: v };
    case "sex":
      if (!(VALID_SEX as readonly string[]).includes(v))
        return { ok: false, error: "Género inválido." };
      return { ok: true, value: v };
    case "sterilized":
      if (v !== "true" && v !== "false") return { ok: false, error: "Valor inválido." };
      return { ok: true, value: v === "true" };
    case "weightKg": {
      if (!v) return { ok: true, value: null };
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0 || n > 999)
        return { ok: false, error: "Peso inválido (kg)." };
      return { ok: true, value: Math.round(n * 100) / 100 };
    }
    case "breed":
    case "color":
      return { ok: true, value: v ? v.slice(0, 60) : null };
    case "microchipId":
      return { ok: true, value: v ? v.slice(0, 40) : null };
  }
}

function revalidatePetPages(petId: string) {
  revalidatePath(`/vet/pacientes/${petId}`);
  revalidatePath(`/vet/pacientes/${petId}/cartilla`);
  revalidatePath(`/vet/pacientes/${petId}/carnet`);
  revalidatePath("/vet/pacientes");
  revalidatePath(`/mascotas/${petId}`);
}

export type UpdatePetFieldResult = { ok: true } | { ok: false; error: string };

/**
 * Cambia un campo de la ficha del paciente y lo registra en la bitácora
 * (quién, qué y cuándo). Sin cambios reales no registra nada.
 */
export async function updatePetFieldAction(input: {
  petId: string;
  field: string;
  value: string | null;
}): Promise<UpdatePetFieldResult> {
  const session = await requireSession();
  if (session.role === "CLIENT") return { ok: false, error: "No autorizado." };

  const field = input.field as EditablePetField;
  if (!(EDITABLE_PET_FIELDS as readonly string[]).includes(field)) {
    return { ok: false, error: "Campo no editable." };
  }
  const pet = await prisma.pet.findUnique({ where: { id: (input.petId ?? "").trim() } });
  if (!pet) return { ok: false, error: "Paciente no encontrado." };

  const parsed = parseField(field, input.value);
  if (!parsed.ok) return parsed;

  const oldSerialized = serializeField(field, pet as unknown as Record<string, unknown>);
  const newSerialized =
    parsed.value === null
      ? null
      : field === "birthDate"
        ? (input.value ?? "").trim()
        : field === "sterilized"
          ? (parsed.value ? "true" : "false")
          : String(parsed.value);

  if (oldSerialized === newSerialized) return { ok: true }; // sin cambios

  await prisma.$transaction([
    prisma.pet.update({ where: { id: pet.id }, data: { [field]: parsed.value } }),
    prisma.petFieldChange.create({
      data: {
        petId: pet.id,
        field,
        oldValue: oldSerialized,
        newValue: newSerialized,
        changedById: session.userId,
      },
    }),
  ]);

  revalidatePetPages(pet.id);
  return { ok: true };
}

/**
 * Revierte un cambio de la bitácora: restaura el valor anterior, registra
 * la reversión como un cambio nuevo (historial siempre completo) y marca
 * el cambio original como revertido.
 */
export async function revertPetFieldChangeAction(
  changeId: string
): Promise<UpdatePetFieldResult> {
  const session = await requireSession();
  if (session.role === "CLIENT") return { ok: false, error: "No autorizado." };

  const change = await prisma.petFieldChange.findUnique({
    where: { id: (changeId ?? "").trim() },
    include: { pet: true },
  });
  if (!change) return { ok: false, error: "Cambio no encontrado." };
  if (change.revertedAt) return { ok: false, error: "Este cambio ya fue revertido." };

  const field = change.field as EditablePetField;
  if (!(EDITABLE_PET_FIELDS as readonly string[]).includes(field)) {
    return { ok: false, error: "Campo no reversible." };
  }
  const parsed = parseField(field, change.oldValue);
  if (!parsed.ok) return parsed;

  const currentSerialized = serializeField(
    field,
    change.pet as unknown as Record<string, unknown>
  );

  await prisma.$transaction([
    prisma.pet.update({ where: { id: change.petId }, data: { [field]: parsed.value } }),
    prisma.petFieldChange.create({
      data: {
        petId: change.petId,
        field,
        oldValue: currentSerialized,
        newValue: change.oldValue,
        changedById: session.userId,
      },
    }),
    prisma.petFieldChange.update({
      where: { id: change.id },
      data: { revertedAt: new Date() },
    }),
  ]);

  revalidatePetPages(change.petId);
  return { ok: true };
}
