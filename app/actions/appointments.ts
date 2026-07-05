"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, requireSession } from "@/lib/auth";
import { estimatePrice } from "@/lib/scheduling";

export async function createAppointmentAction(
  formData: FormData
): Promise<{ id: string; scheduledAt: string }> {
  const session = await requireSession();
  if (session.role !== "CLIENT") throw new Error("FORBIDDEN");

  const petId = String(formData.get("petId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const vetId = String(formData.get("vetId") ?? "");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const clientNotes = String(formData.get("clientNotes") ?? "").trim() || null;

  if (!petId || !serviceId || !vetId || !scheduledAtRaw) {
    throw new Error("Faltan campos para agendar.");
  }

  const [pet, service] = await Promise.all([
    prisma.pet.findUniqueOrThrow({ where: { id: petId } }),
    prisma.service.findUniqueOrThrow({ where: { id: serviceId } }),
  ]);
  if (pet.ownerId !== session.userId) throw new Error("FORBIDDEN");

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Fecha inválida.");
  if (scheduledAt.getTime() < Date.now()) throw new Error("No puedes agendar en el pasado.");

  const priceEstimate = await estimatePrice(serviceId, pet.species);
  const fromAppointmentId = String(formData.get("fromAppointmentId") ?? "").trim() || null;

  // If reagendando, validate the original belongs to this client
  if (fromAppointmentId) {
    const original = await prisma.appointment.findUnique({
      where: { id: fromAppointmentId },
      select: { clientId: true, status: true },
    });
    if (!original || original.clientId !== session.userId) {
      throw new Error("Cita original no válida.");
    }
  }

  const [appt] = await prisma.$transaction([
    prisma.appointment.create({
      data: {
        clientId: session.userId,
        petId,
        vetId,
        serviceId,
        scheduledAt,
        durationMinutes: service.durationMinutes,
        priceEstimate,
        clientNotes,
        status: "SCHEDULED",
      },
    }),
    ...(fromAppointmentId
      ? [
          prisma.appointment.update({
            where: { id: fromAppointmentId },
            data: { status: "CANCELLED" },
          }),
        ]
      : []),
  ]);

  revalidatePath("/inicio");
  revalidatePath("/vet");
  if (fromAppointmentId) {
    revalidatePath(`/cita/${fromAppointmentId}`);
    revalidatePath(`/vet/cita/${fromAppointmentId}`);
  }
  return { id: appt.id, scheduledAt: appt.scheduledAt.toISOString() };
}

export async function cancelAppointmentAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const appt = await prisma.appointment.findUniqueOrThrow({ where: { id } });
  const allowed =
    session.role === "ADMIN" ||
    (session.role === "CLIENT" && appt.clientId === session.userId) ||
    session.role === "VET";
  if (!allowed) throw new Error("FORBIDDEN");
  await prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/inicio");
  revalidatePath("/vet");
  revalidatePath(`/cita/${id}`);
}

const VALID_SPECIES_VALUES = ["DOG", "CAT", "BIRD", "RABBIT", "HAMSTER", "REPTILE", "OTHER"] as const;

export type CreateAppointmentResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Vet/admin action: create an appointment manually (e.g., when a client
 * books over the phone). Supports creating a brand-new client (with just
 * name + phone) and a brand-new pet on the fly. The created client gets a
 * placeholder email + random password since they aren't logging in.
 */
export async function createAppointmentByVetAction(
  _: unknown,
  formData: FormData
): Promise<CreateAppointmentResult> {
  const session = await requireSession();
  if (session.role !== "VET" && session.role !== "ADMIN") {
    return { ok: false, error: "No autorizado." };
  }

  const clientId = String(formData.get("clientId") ?? "").trim();
  const newClientName = String(formData.get("newClientName") ?? "").trim();
  const newClientPhone = String(formData.get("newClientPhone") ?? "").replace(/\D+/g, "");
  const petId = String(formData.get("petId") ?? "").trim();
  const newPetName = String(formData.get("newPetName") ?? "").trim();
  const newPetSpecies = String(formData.get("newPetSpecies") ?? "").trim();
  const newPetBreed = String(formData.get("newPetBreed") ?? "").trim() || null;
  const serviceId = String(formData.get("serviceId") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();
  const clientNotes = String(formData.get("clientNotes") ?? "").trim() || null;
  const vetIdOverride = String(formData.get("vetId") ?? "").trim();

  if (!serviceId) return { ok: false, error: "Selecciona un servicio." };
  if (!date || !time) return { ok: false, error: "Falta fecha u hora." };

  // Resolve vet
  let vetId = vetIdOverride;
  if (!vetId) {
    const vet = await prisma.veterinarian.findUnique({
      where: { userId: session.userId },
    });
    if (vet) {
      vetId = vet.id;
    } else if (session.role === "ADMIN") {
      return { ok: false, error: "Selecciona un veterinario." };
    } else {
      return { ok: false, error: "Tu cuenta no tiene perfil de veterinario." };
    }
  }

  // Resolve client (existing or new)
  let resolvedClientId = clientId;
  if (!resolvedClientId) {
    if (!newClientName) return { ok: false, error: "Ingresa el nombre del cliente." };
    if (newClientPhone.length < 7)
      return { ok: false, error: "Ingresa un teléfono válido (mín. 7 dígitos)." };
    // Reuse existing user with this phone if it exists
    const byPhone = await prisma.user.findUnique({ where: { phone: newClientPhone } });
    if (byPhone) {
      if (byPhone.role !== "CLIENT")
        return { ok: false, error: "Ese teléfono pertenece a personal de la clínica." };
      resolvedClientId = byPhone.id;
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
      resolvedClientId = created.id;
    }
  }

  // Resolve pet (existing or new)
  let resolvedPetId = petId;
  if (!resolvedPetId) {
    if (!newPetName) return { ok: false, error: "Ingresa el nombre de la mascota." };
    if (!(VALID_SPECIES_VALUES as readonly string[]).includes(newPetSpecies))
      return { ok: false, error: "Selecciona la especie." };
    const pet = await prisma.pet.create({
      data: {
        ownerId: resolvedClientId,
        name: newPetName,
        species: newPetSpecies as Species,
        breed: newPetBreed,
      },
    });
    resolvedPetId = pet.id;
  } else {
    // Verify ownership
    const pet = await prisma.pet.findUnique({ where: { id: resolvedPetId } });
    if (!pet || pet.ownerId !== resolvedClientId) {
      return { ok: false, error: "La mascota no pertenece al cliente." };
    }
  }

  // Service + price
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { ok: false, error: "Servicio no encontrado." };
  const pet = await prisma.pet.findUnique({ where: { id: resolvedPetId } });
  if (!pet) return { ok: false, error: "Mascota no encontrada." };
  const priceEstimate = await estimatePrice(serviceId, pet.species);

  // Combine date+time into a Date in local timezone
  const scheduledAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: "Fecha u hora inválida." };
  }

  const appt = await prisma.appointment.create({
    data: {
      vetId,
      petId: resolvedPetId,
      clientId: resolvedClientId,
      serviceId: service.id,
      scheduledAt,
      durationMinutes: service.durationMinutes,
      status: "SCHEDULED",
      priceEstimate,
      clientNotes,
    },
  });

  revalidatePath("/vet");
  revalidatePath("/vet/hoy");
  revalidatePath("/vet/calendario");
  revalidatePath("/vet/pacientes");
  revalidatePath("/inicio");

  return { ok: true, id: appt.id };
}

export async function updateAppointmentNotesAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "VET" && session.role !== "ADMIN") throw new Error("FORBIDDEN");
  const id = String(formData.get("id") ?? "");
  const vetNotes = String(formData.get("vetNotes") ?? "").trim() || null;
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const medications = String(formData.get("medications") ?? "").trim() || null;
  const markCompleted = formData.get("markCompleted") === "on";

  await prisma.appointment.update({
    where: { id },
    data: {
      vetNotes,
      instructions,
      medications,
      ...(markCompleted ? { status: "COMPLETED" } : {}),
    },
  });
  revalidatePath("/vet");
  revalidatePath("/inicio");
  revalidatePath(`/cita/${id}`);
  revalidatePath(`/vet/cita/${id}`);
}

/* ─── New: dynamic consulta data (schema-driven) ──────────────── */

import {
  LEGACY_FIELD_IDS,
  extractCarnetEntry,
  parseFormSchema,
  type ConsultaData,
} from "@/lib/form-schema";

export type SaveConsultaResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Persist the answers from the dynamic consulta form. Also mirrors the
 * three legacy text columns (vetNotes / instructions / medications) so
 * the receta PDF and any existing UI keep working.
 *
 * If markCompleted is true, the appointment is moved to COMPLETED.
 */
export async function saveConsultaDataAction(
  appointmentId: string,
  data: ConsultaData,
  options: { markCompleted?: boolean } = {}
): Promise<SaveConsultaResult> {
  const session = await requireSession();
  if (session.role !== "VET" && session.role !== "ADMIN") {
    return { ok: false, error: "FORBIDDEN" };
  }
  const id = (appointmentId ?? "").trim();
  if (!id) return { ok: false, error: "Cita inválida." };

  // Coerce values into JSON-safe primitives.
  const clean: ConsultaData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length > 0) clean[k] = trimmed;
    } else if (Array.isArray(v)) {
      const filtered = v
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
      if (filtered.length > 0) clean[k] = filtered;
    } else if (typeof v === "boolean" || typeof v === "number") {
      clean[k] = v;
    }
  }

  // Mirror legacy text columns so anything that still reads them keeps
  // working. We only treat string values as legacy mirrors.
  const legacyMirror: Record<string, string | null> = {};
  for (const key of ["vetNotes", "instructions", "medications"] as const) {
    const fieldId = LEGACY_FIELD_IDS[key];
    const v = clean[fieldId];
    legacyMirror[key] = typeof v === "string" ? v : null;
  }

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        status: true,
        petId: true,
        scheduledAt: true,
        service: { select: { name: true, formSchema: true } },
        pet: { select: { weightKg: true } },
      },
    });
    if (!appt) return { ok: false, error: "Cita no encontrada." };

    await prisma.appointment.update({
      where: { id },
      data: {
        consultaData: JSON.stringify(clean),
        vetNotes: legacyMirror.vetNotes,
        instructions: legacyMirror.instructions,
        medications: legacyMirror.medications,
        ...(options.markCompleted ? { status: "COMPLETED" } : {}),
      },
    });

    // On the transition to COMPLETED (never on re-saves), mirror the
    // vacunación/desparasitación answers into the pet's permanent records
    // if the vet ticked the "agregar al carnet" checkbox — this is what
    // feeds the cartilla and the carnet de vacunación. A same-day duplicate
    // check keeps reopen→re-complete cycles from doubling records.
    if (options.markCompleted && appt.status !== "COMPLETED") {
      const entry = extractCarnetEntry(
        parseFormSchema(appt.service.formSchema),
        clean,
        appt.service.name
      );
      if (entry?.kind === "vaccine") {
        const appliedAt = entry.appliedAt ?? appt.scheduledAt;
        const dup = await prisma.vaccine.findFirst({
          where: { petId: appt.petId, name: entry.name, appliedAt },
          select: { id: true },
        });
        if (!dup) {
          await prisma.vaccine.create({
            data: {
              petId: appt.petId,
              name: entry.name,
              appliedAt,
              nextAt: entry.nextAt,
              weightKg: entry.weightKg ?? appt.pet.weightKg,
              notes: entry.notes,
              addedByUserId: session.userId,
            },
          });
        }
      } else if (entry?.kind === "deworming") {
        const appliedAt = entry.appliedAt ?? appt.scheduledAt;
        const dup = await prisma.deworming.findFirst({
          where: { petId: appt.petId, product: entry.product, appliedAt },
          select: { id: true },
        });
        if (!dup) {
          await prisma.deworming.create({
            data: {
              petId: appt.petId,
              product: entry.product,
              kind: entry.dewormKind,
              appliedAt,
              nextAt: entry.nextAt,
              notes: entry.notes,
              addedByUserId: session.userId,
            },
          });
        }
      }
      if (entry) {
        revalidatePath(`/vet/pacientes/${appt.petId}/cartilla`);
        revalidatePath(`/vet/pacientes/${appt.petId}/carnet`);
        revalidatePath("/salud/cartilla");
      }
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar.",
    };
  }

  revalidatePath("/vet");
  revalidatePath("/inicio");
  revalidatePath(`/cita/${id}`);
  revalidatePath(`/vet/cita/${id}`);
  return { ok: true };
}

/**
 * Reabre una cita atendida o cancelada para que el veterinario pueda
 * trabajar la consulta de nuevo. Vuelve el estado a SCHEDULED; al
 * marcarla atendida otra vez, el guardado en carnet no duplica
 * registros (ver dedup arriba).
 */
export async function reopenAppointmentAction(
  appointmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  if (session.role !== "VET" && session.role !== "ADMIN") {
    return { ok: false, error: "FORBIDDEN" };
  }
  const id = (appointmentId ?? "").trim();
  if (!id) return { ok: false, error: "Cita inválida." };

  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!appt) return { ok: false, error: "Cita no encontrada." };
  if (appt.status !== "COMPLETED" && appt.status !== "CANCELLED") {
    return { ok: false, error: "La cita ya está abierta." };
  }

  await prisma.appointment.update({
    where: { id },
    data: { status: "SCHEDULED" },
  });

  revalidatePath("/vet");
  revalidatePath("/inicio");
  revalidatePath(`/cita/${id}`);
  revalidatePath(`/vet/cita/${id}`);
  return { ok: true };
}

/**
 * Reagenda una cita: cambia fecha/hora y opcionalmente el servicio
 * (motivo). Al cambiar el servicio se recalculan duración y precio
 * estimado. Una cita cancelada que se reagenda vuelve a quedar
 * agendada.
 */
export async function rescheduleAppointmentAction(
  appointmentId: string,
  input: { date: string; time: string; serviceId?: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  if (session.role !== "VET" && session.role !== "ADMIN") {
    return { ok: false, error: "FORBIDDEN" };
  }
  const id = (appointmentId ?? "").trim();
  if (!id) return { ok: false, error: "Cita inválida." };

  const date = (input.date ?? "").trim();
  const time = (input.time ?? "").trim();
  if (!date || !time) return { ok: false, error: "Falta la fecha o la hora." };
  const scheduledAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: "Fecha u hora inválida." };
  }

  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: {
      status: true,
      serviceId: true,
      durationMinutes: true,
      priceEstimate: true,
      pet: { select: { species: true } },
    },
  });
  if (!appt) return { ok: false, error: "Cita no encontrada." };
  if (appt.status === "COMPLETED") {
    return { ok: false, error: "Reabre la cita antes de reagendarla." };
  }

  const serviceId = (input.serviceId ?? "").trim() || appt.serviceId;
  let durationMinutes = appt.durationMinutes;
  let priceEstimate = appt.priceEstimate;
  if (serviceId !== appt.serviceId) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return { ok: false, error: "Servicio no encontrado." };
    durationMinutes = service.durationMinutes;
    priceEstimate = await estimatePrice(serviceId, appt.pet.species);
  }

  await prisma.appointment.update({
    where: { id },
    data: {
      scheduledAt,
      serviceId,
      durationMinutes,
      priceEstimate,
      status: "SCHEDULED",
    },
  });

  revalidatePath("/vet");
  revalidatePath("/vet/hoy");
  revalidatePath("/vet/calendario");
  revalidatePath("/inicio");
  revalidatePath(`/cita/${id}`);
  revalidatePath(`/vet/cita/${id}`);
  return { ok: true };
}

/**
 * Registra una opción nueva en el catálogo de un campo select del
 * formulario del servicio (p.ej. un biológico que no estaba en la
 * lista). La opción se inserta antes de "Otro" para que esa salida
 * siga siendo la última, y queda disponible para futuras consultas.
 */
export async function addServiceSelectOptionAction(
  appointmentId: string,
  fieldId: string,
  option: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  if (session.role !== "VET" && session.role !== "ADMIN") {
    return { ok: false, error: "FORBIDDEN" };
  }
  const id = (appointmentId ?? "").trim();
  const fid = (fieldId ?? "").trim();
  const name = (option ?? "").trim();
  if (!id || !fid) return { ok: false, error: "Datos inválidos." };
  if (!name) return { ok: false, error: "Escribe el nombre." };
  if (name.length > 80) return { ok: false, error: "El nombre es demasiado largo." };

  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: { service: { select: { id: true, formSchema: true } } },
  });
  if (!appt) return { ok: false, error: "Cita no encontrada." };

  const schema = parseFormSchema(appt.service.formSchema);
  if (!schema) return { ok: false, error: "El servicio no tiene formulario configurado." };

  let found = false;
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.id !== fid || field.type !== "select") continue;
      found = true;
      const options = field.options ?? [];
      const exists = options.some(
        (o) => o.trim().toLowerCase() === name.toLowerCase()
      );
      if (!exists) {
        const otherIdx = options.findIndex((o) => /^otr[oa]s?\b/i.test(o.trim()));
        if (otherIdx >= 0) options.splice(otherIdx, 0, name);
        else options.push(name);
        field.options = options;
      }
    }
  }
  if (!found) return { ok: false, error: "Campo no encontrado en el formulario." };

  await prisma.service.update({
    where: { id: appt.service.id },
    data: { formSchema: JSON.stringify(schema) },
  });
  revalidatePath(`/vet/cita/${id}`);
  revalidatePath(`/admin/servicios/${appt.service.id}`);
  return { ok: true };
}

/* ─── Service form schema ─────────────────────────────────────── */

import type { FormSchema } from "@/lib/form-schema";

export async function updateServiceFormSchemaAction(
  serviceId: string,
  schema: FormSchema
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  if (session.role !== "ADMIN") return { ok: false, error: "FORBIDDEN" };
  const id = (serviceId ?? "").trim();
  if (!id) return { ok: false, error: "Servicio inválido." };

  // Basic shape validation — we don't fully validate every field; the
  // builder writes well-formed data and the renderer parses defensively.
  if (
    !schema ||
    schema.version !== 1 ||
    !Array.isArray(schema.sections)
  ) {
    return { ok: false, error: "Formato del formulario inválido." };
  }

  await prisma.service.update({
    where: { id },
    data: { formSchema: JSON.stringify(schema) },
  });
  revalidatePath("/admin/servicios");
  revalidatePath(`/admin/servicios/${id}`);
  return { ok: true };
}

type Species = "DOG" | "CAT" | "BIRD" | "RABBIT" | "HAMSTER" | "REPTILE" | "OTHER";
type Sex = "MALE" | "FEMALE" | "UNKNOWN";

function readPetForm(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const species = String(fd.get("species") ?? "DOG") as Species;
  const sex = String(fd.get("sex") ?? "UNKNOWN") as Sex;
  const breed = String(fd.get("breed") ?? "").trim() || null;
  const color = String(fd.get("color") ?? "").trim() || null;
  const microchipId = String(fd.get("microchipId") ?? "").trim() || null;
  const sterilized = fd.get("sterilized") === "on";
  const weightRaw = String(fd.get("weightKg") ?? "").trim();
  const weightKg = weightRaw === "" ? null : Number(weightRaw);
  const birthRaw = String(fd.get("birthDate") ?? "").trim();
  const birthDate = birthRaw === "" ? null : new Date(birthRaw);
  const notes = String(fd.get("notes") ?? "").trim() || null;
  const photoUrl = String(fd.get("photoUrl") ?? "").trim() || null;
  return { name, species, sex, breed, color, microchipId, sterilized, weightKg, birthDate, notes, photoUrl };
}

export async function addPetAction(formData: FormData): Promise<{ id: string }> {
  const session = await requireSession();
  if (session.role !== "CLIENT") throw new Error("FORBIDDEN");
  const data = readPetForm(formData);
  if (!data.name) throw new Error("Falta nombre.");
  const created = await prisma.pet.create({
    data: {
      ownerId: session.userId,
      ...data,
      weightKg: data.weightKg && Number.isFinite(data.weightKg) ? data.weightKg : null,
      birthDate: data.birthDate && !Number.isNaN(data.birthDate.getTime()) ? data.birthDate : null,
    },
    select: { id: true },
  });
  revalidatePath("/mascotas");
  revalidatePath("/agendar");
  revalidatePath("/inicio");
  return { id: created.id };
}

export async function deletePetPhotoAction(photoId: string): Promise<void> {
  const session = await requireSession();
  const id = (photoId ?? "").trim();
  if (!id) throw new Error("Datos inválidos.");
  const photo = await prisma.petPhoto.findUnique({
    where: { id },
    include: { pet: { select: { ownerId: true } } },
  });
  if (!photo) throw new Error("Foto no encontrada.");
  if (photo.pet.ownerId !== session.userId && session.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  await prisma.petPhoto.delete({ where: { id } });
  revalidatePath(`/mascotas/${photo.petId}`);
}

export async function updatePetAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "CLIENT") throw new Error("FORBIDDEN");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Falta id.");
  const pet = await prisma.pet.findUnique({ where: { id } });
  if (!pet || pet.ownerId !== session.userId) throw new Error("FORBIDDEN");
  const data = readPetForm(formData);
  if (!data.name) throw new Error("Falta nombre.");
  await prisma.pet.update({
    where: { id },
    data: {
      ...data,
      weightKg: data.weightKg && Number.isFinite(data.weightKg) ? data.weightKg : null,
      birthDate: data.birthDate && !Number.isNaN(data.birthDate.getTime()) ? data.birthDate : null,
    },
  });
  revalidatePath("/mascotas");
  revalidatePath(`/mascotas/${id}`);
  revalidatePath("/agendar");
}

export type DeletePetResult = { ok: true } | { ok: false; error: string };

export async function deletePetAction(formData: FormData): Promise<DeletePetResult> {
  const session = await requireSession();
  if (session.role !== "CLIENT") return { ok: false, error: "No autorizado." };
  const id = String(formData.get("id") ?? "");
  const pet = await prisma.pet.findUnique({ where: { id } });
  if (!pet || pet.ownerId !== session.userId) return { ok: false, error: "No autorizado." };
  const activeAppts = await prisma.appointment.count({
    where: {
      petId: id,
      status: "SCHEDULED",
      scheduledAt: { gte: new Date() },
    },
  });
  if (activeAppts > 0) {
    return { ok: false, error: "Esta mascota tiene citas próximas. Cancélalas primero." };
  }
  await prisma.$transaction([
    prisma.appointment.deleteMany({ where: { petId: id } }),
    prisma.pet.delete({ where: { id } }),
  ]);
  revalidatePath("/mascotas");
  revalidatePath("/inicio");
  return { ok: true };
}
