"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
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

export async function addPetAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "CLIENT") throw new Error("FORBIDDEN");
  const data = readPetForm(formData);
  if (!data.name) throw new Error("Falta nombre.");
  await prisma.pet.create({
    data: {
      ownerId: session.userId,
      ...data,
      weightKg: data.weightKg && Number.isFinite(data.weightKg) ? data.weightKg : null,
      birthDate: data.birthDate && !Number.isNaN(data.birthDate.getTime()) ? data.birthDate : null,
    },
  });
  revalidatePath("/mascotas");
  revalidatePath("/agendar");
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
