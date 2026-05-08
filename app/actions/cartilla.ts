"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export type AddResult =
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
}

/* ─── Deworming ────────────────────────────────────────────── */

export async function addDewormingAction(
  _prev: unknown,
  formData: FormData
): Promise<AddResult> {
  const session = await requireSession();
  const petId = String(formData.get("petId") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "").trim();
  const kind = ["Interna", "Externa", "Ambas"].includes(kindRaw) ? kindRaw : null;
  const applied = parseDate(formData.get("appliedAt"));
  const next = parseDate(formData.get("nextAt"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!petId) return { ok: false, error: "Mascota inválida." };
  if (!product) return { ok: false, error: "Pon el producto aplicado." };
  if (!applied) return { ok: false, error: "Pon la fecha en que se aplicó." };

  try {
    await ensurePetAccess(petId, session.userId, session.role);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "FORBIDDEN" };
  }

  const created = await prisma.deworming.create({
    data: {
      petId,
      product,
      kind,
      appliedAt: applied,
      nextAt: next,
      notes,
      addedByUserId: session.userId,
    },
    select: { id: true },
  });

  revalidatePath(`/salud`);
  revalidatePath(`/salud/cartilla`);
  revalidatePath(`/vet/pacientes/${petId}`);
  return { ok: true, id: created.id };
}

export async function deleteDewormingAction(id: string): Promise<void> {
  const session = await requireSession();
  const trimmed = (id ?? "").trim();
  if (!trimmed) throw new Error("Datos inválidos.");
  const row = await prisma.deworming.findUnique({
    where: { id: trimmed },
    include: { pet: { select: { ownerId: true } } },
  });
  if (!row) throw new Error("No encontrado.");
  const isOwner = row.pet.ownerId === session.userId;
  const isAdder = row.addedByUserId === session.userId;
  const isAdmin = session.role === "ADMIN";
  if (!isOwner && !isAdder && !isAdmin) throw new Error("FORBIDDEN");
  await prisma.deworming.delete({ where: { id: trimmed } });
  revalidatePath(`/salud`);
  revalidatePath(`/salud/cartilla`);
  revalidatePath(`/vet/pacientes/${row.petId}`);
}

/* ─── Pet card customization ───────────────────────────────── */

export async function updatePetCustomizationAction(
  petId: string,
  data: {
    cardStyle?: string | null;
    personalityTags?: string[] | null;
    customMood?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const id = (petId ?? "").trim();
  if (!id) return { ok: false, error: "Mascota inválida." };

  const pet = await prisma.pet.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!pet) return { ok: false, error: "Mascota no encontrada." };
  if (pet.ownerId !== session.userId && session.role !== "ADMIN") {
    return { ok: false, error: "FORBIDDEN" };
  }

  const update: {
    cardStyle?: string | null;
    personalityTags?: string | null;
    customMood?: string | null;
  } = {};

  if (data.cardStyle !== undefined) {
    const s = data.cardStyle;
    if (s === "transparent") update.cardStyle = "transparent";
    else if (s && /^[0-9]$/.test(s)) update.cardStyle = s;
    else update.cardStyle = null;
  }

  if (data.personalityTags !== undefined) {
    if (!data.personalityTags || data.personalityTags.length === 0) {
      update.personalityTags = null;
    } else {
      const cleaned = data.personalityTags
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= 24)
        .slice(0, 3);
      update.personalityTags =
        cleaned.length > 0 ? JSON.stringify(cleaned) : null;
    }
  }

  if (data.customMood !== undefined) {
    const mood = (data.customMood ?? "").trim();
    update.customMood = mood.length === 0 ? null : mood.slice(0, 80);
  }

  await prisma.pet.update({ where: { id }, data: update });

  revalidatePath("/inicio");
  revalidatePath("/personalizar");
  return { ok: true };
}

/* ─── Pet card style (legacy single-field action) ──────────── */

export async function updatePetCardStyleAction(
  petId: string,
  style: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const id = (petId ?? "").trim();
  if (!id) return { ok: false, error: "Mascota inválida." };

  const pet = await prisma.pet.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!pet) return { ok: false, error: "Mascota no encontrada." };
  if (pet.ownerId !== session.userId && session.role !== "ADMIN") {
    return { ok: false, error: "FORBIDDEN" };
  }

  // Whitelist: null, "auto", "transparent", or "0".."9"
  let value: string | null = null;
  if (style === "transparent") value = "transparent";
  else if (style && /^[0-9]$/.test(style)) value = style;
  else if (style === "auto") value = null;
  else value = null;

  await prisma.pet.update({
    where: { id },
    data: { cardStyle: value },
  });

  revalidatePath("/inicio");
  revalidatePath("/personalizar");
  return { ok: true };
}

/* ─── Surgery ──────────────────────────────────────────────── */

export async function addSurgeryAction(
  _prev: unknown,
  formData: FormData
): Promise<AddResult> {
  const session = await requireSession();
  const petId = String(formData.get("petId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const performed = parseDate(formData.get("performedAt"));
  const clinic = String(formData.get("clinic") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!petId) return { ok: false, error: "Mascota inválida." };
  if (!name) return { ok: false, error: "Pon el nombre del procedimiento." };
  if (!performed) return { ok: false, error: "Pon la fecha." };

  try {
    await ensurePetAccess(petId, session.userId, session.role);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "FORBIDDEN" };
  }

  const created = await prisma.surgery.create({
    data: {
      petId,
      name,
      performedAt: performed,
      clinic,
      notes,
      addedByUserId: session.userId,
    },
    select: { id: true },
  });

  revalidatePath(`/salud`);
  revalidatePath(`/salud/cartilla`);
  revalidatePath(`/vet/pacientes/${petId}`);
  return { ok: true, id: created.id };
}

export async function deleteSurgeryAction(id: string): Promise<void> {
  const session = await requireSession();
  const trimmed = (id ?? "").trim();
  if (!trimmed) throw new Error("Datos inválidos.");
  const row = await prisma.surgery.findUnique({
    where: { id: trimmed },
    include: { pet: { select: { ownerId: true } } },
  });
  if (!row) throw new Error("No encontrado.");
  const isOwner = row.pet.ownerId === session.userId;
  const isAdder = row.addedByUserId === session.userId;
  const isAdmin = session.role === "ADMIN";
  if (!isOwner && !isAdder && !isAdmin) throw new Error("FORBIDDEN");
  await prisma.surgery.delete({ where: { id: trimmed } });
  revalidatePath(`/salud`);
  revalidatePath(`/salud/cartilla`);
  revalidatePath(`/vet/pacientes/${row.petId}`);
}
