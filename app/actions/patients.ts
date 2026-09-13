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
