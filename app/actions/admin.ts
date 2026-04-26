"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, hashPassword } from "@/lib/auth";

async function ensureAdmin() {
  const s = await requireSession();
  if (s.role !== "ADMIN") throw new Error("FORBIDDEN");
  return s;
}

export async function upsertServiceAction(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const basePrice = Number(formData.get("basePrice") ?? 0);
  const durationMinutes = Number(formData.get("durationMinutes") ?? 30);
  const active = formData.get("active") === "on";
  if (!name || !Number.isFinite(basePrice) || basePrice < 0) throw new Error("Datos inválidos.");
  if (id) {
    await prisma.service.update({
      where: { id },
      data: { name, description, basePrice, durationMinutes, active },
    });
  } else {
    await prisma.service.create({
      data: { name, description, basePrice, durationMinutes, active },
    });
  }
  revalidatePath("/admin/servicios");
  revalidatePath("/agendar");
}

export async function deleteServiceAction(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const count = await prisma.appointment.count({ where: { serviceId: id } });
  if (count > 0) {
    await prisma.service.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.service.delete({ where: { id } });
  }
  revalidatePath("/admin/servicios");
}

export async function updateSpeciesModifierAction(formData: FormData) {
  await ensureAdmin();
  const species = String(formData.get("species") ?? "") as
    | "DOG"
    | "CAT"
    | "BIRD"
    | "RABBIT"
    | "HAMSTER"
    | "REPTILE"
    | "OTHER";
  const multiplier = Number(formData.get("multiplier") ?? 1);
  if (!species || !Number.isFinite(multiplier) || multiplier <= 0) throw new Error("Datos inválidos.");
  await prisma.speciesPriceModifier.upsert({
    where: { species },
    update: { multiplier },
    create: { species, multiplier },
  });
  revalidatePath("/admin/tarifas");
  revalidatePath("/agendar");
}

export async function updateScheduleAction(formData: FormData) {
  await ensureAdmin();
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const isOpen = formData.get("isOpen") === "on";
  const open = String(formData.get("openTime") ?? "09:00");
  const close = String(formData.get("closeTime") ?? "18:00");
  const slotMinutes = Number(formData.get("slotMinutes") ?? 30);

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  await prisma.clinicSchedule.upsert({
    where: { dayOfWeek },
    update: {
      isOpen,
      openMinutes: toMinutes(open),
      closeMinutes: toMinutes(close),
      slotMinutes,
    },
    create: {
      dayOfWeek,
      isOpen,
      openMinutes: toMinutes(open),
      closeMinutes: toMinutes(close),
      slotMinutes,
    },
  });
  revalidatePath("/admin/horario");
  revalidatePath("/agendar");
}

export async function addVetAction(formData: FormData) {
  await ensureAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/\D+/g, "");
  const password = String(formData.get("password") ?? "");
  const bio = String(formData.get("bio") ?? "").trim() || null;
  if (!name || phone.length < 7 || password.length < 4) throw new Error("Datos inválidos.");
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new Error("Teléfono ya registrado.");
  const hash = await hashPassword(password);
  await prisma.user.create({
    data: {
      name,
      phone,
      passwordHash: hash,
      role: "VET",
      vetProfile: { create: { bio } },
    },
  });
  revalidatePath("/admin/veterinarios");
}

export async function removeVetAction(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get("id") ?? "");
  const vet = await prisma.veterinarian.findUnique({ where: { id } });
  if (!vet) return;
  const count = await prisma.appointment.count({ where: { vetId: id } });
  if (count > 0) throw new Error("Este veterinario tiene citas; no se puede eliminar.");
  await prisma.user.delete({ where: { id: vet.userId } });
  revalidatePath("/admin/veterinarios");
}
