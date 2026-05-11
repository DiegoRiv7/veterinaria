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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").replace(/\D+/g, "");
  const password = String(formData.get("password") ?? "");
  const bio = String(formData.get("bio") ?? "").trim() || null;
  if (!name || phone.length < 7 || password.length < 4) throw new Error("Datos inválidos.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Correo inválido.");
  const [byEmail, byPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { phone } }),
  ]);
  if (byEmail) throw new Error("Correo ya registrado.");
  if (byPhone) throw new Error("Teléfono ya registrado.");
  const hash = await hashPassword(password);
  await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash: hash,
      role: "VET",
      vetProfile: { create: { bio } },
    },
  });
  revalidatePath("/admin/usuarios");
}

/* ─── Generic create-user (vet / receptionist / admin) ─────── */

export type CreateUserInput = {
  role: "VET" | "RECEPTIONIST" | "ADMIN";
  name: string;
  email: string;
  phone: string;
  password: string;
  /** Vet-only fields */
  bio?: string;
  workingHours?: {
    dayOfWeek: number;
    isWorking: boolean;
    startMinutes: number;
    endMinutes: number;
  }[];
};

export async function createUserAction(
  data: CreateUserInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await ensureAdmin();
  const name = (data.name ?? "").trim();
  const email = (data.email ?? "").trim().toLowerCase();
  const phone = (data.phone ?? "").replace(/\D+/g, "");
  const password = data.password ?? "";

  if (!name) return { ok: false, error: "El nombre es obligatorio." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Correo inválido." };
  if (phone.length < 7)
    return { ok: false, error: "Teléfono inválido (mínimo 7 dígitos)." };
  if (password.length < 4)
    return { ok: false, error: "La contraseña debe tener al menos 4 caracteres." };

  const [byEmail, byPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { phone }, select: { id: true } }),
  ]);
  if (byEmail) return { ok: false, error: "Correo ya registrado." };
  if (byPhone) return { ok: false, error: "Teléfono ya registrado." };

  const hash = await hashPassword(password);

  if (data.role === "VET") {
    const bio = (data.bio ?? "").trim() || null;
    const wh = data.workingHours ?? [];

    // Validate hours
    for (const r of wh) {
      if (
        !Number.isInteger(r.dayOfWeek) ||
        r.dayOfWeek < 0 ||
        r.dayOfWeek > 6 ||
        r.startMinutes < 0 ||
        r.startMinutes > 1440 ||
        r.endMinutes < 0 ||
        r.endMinutes > 1440
      )
        return { ok: false, error: "Horario inválido." };
      if (r.isWorking && r.endMinutes <= r.startMinutes)
        return {
          ok: false,
          error: `La hora de fin debe ser mayor que la de inicio (día ${r.dayOfWeek}).`,
        };
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash: hash,
        role: "VET",
        vetProfile: {
          create: {
            bio,
            workingHours: wh.length
              ? {
                  create: wh.map((r) => ({
                    dayOfWeek: r.dayOfWeek,
                    isWorking: r.isWorking,
                    startMinutes: r.startMinutes,
                    endMinutes: r.endMinutes,
                  })),
                }
              : undefined,
          },
        },
      },
      include: { vetProfile: { select: { id: true } } },
    });
    revalidatePath("/admin/usuarios");
    revalidatePath("/agendar");
    return { ok: true, id: user.vetProfile?.id ?? user.id };
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash: hash,
      role: data.role,
    },
    select: { id: true },
  });
  revalidatePath("/admin/usuarios");
  return { ok: true, id: user.id };
}

export async function removeUserAction(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await ensureAdmin();
  const id = (userId ?? "").trim();
  if (!id) return { ok: false, error: "Usuario inválido." };
  if (id === session.userId)
    return { ok: false, error: "No puedes eliminar tu propio usuario." };

  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, vetProfile: { select: { id: true } } },
  });
  if (!user) return { ok: false, error: "Usuario no encontrado." };

  if (user.role === "CLIENT")
    return { ok: false, error: "No se puede eliminar clientes desde aquí." };

  if (user.vetProfile) {
    const count = await prisma.appointment.count({
      where: { vetId: user.vetProfile.id },
    });
    if (count > 0)
      return {
        ok: false,
        error: "Este veterinario tiene citas; no se puede eliminar.",
      };
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function removeVetAction(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get("id") ?? "");
  const vet = await prisma.veterinarian.findUnique({ where: { id } });
  if (!vet) return;
  const count = await prisma.appointment.count({ where: { vetId: id } });
  if (count > 0) throw new Error("Este veterinario tiene citas; no se puede eliminar.");
  await prisma.user.delete({ where: { id: vet.userId } });
  revalidatePath("/admin/usuarios");
}

/* ─── Vet edit / password / schedule ───────────────────────── */

export async function updateVetAction(
  vetId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    bio?: string | null;
    photoUrl?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureAdmin();
  const id = (vetId ?? "").trim();
  if (!id) return { ok: false, error: "Vet inválido." };

  const vet = await prisma.veterinarian.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!vet) return { ok: false, error: "Veterinario no encontrado." };

  try {
    const userUpdate: Record<string, unknown> = {};
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) return { ok: false, error: "El nombre no puede estar vacío." };
      userUpdate.name = name;
    }
    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { ok: false, error: "Correo inválido." };
      const dup = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (dup && dup.id !== vet.userId)
        return { ok: false, error: "Correo ya registrado." };
      userUpdate.email = email;
    }
    if (data.phone !== undefined) {
      const phone = data.phone.replace(/\D+/g, "");
      if (phone.length < 7)
        return { ok: false, error: "Teléfono inválido." };
      const dup = await prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      });
      if (dup && dup.id !== vet.userId)
        return { ok: false, error: "Teléfono ya registrado." };
      userUpdate.phone = phone;
    }

    const vetUpdate: Record<string, unknown> = {};
    if (data.bio !== undefined) {
      const bio = (data.bio ?? "").trim();
      vetUpdate.bio = bio.length === 0 ? null : bio.slice(0, 280);
    }
    if (data.photoUrl !== undefined) {
      vetUpdate.photoUrl = data.photoUrl;
    }

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({ where: { id: vet.userId }, data: userUpdate });
    }
    if (Object.keys(vetUpdate).length > 0) {
      await prisma.veterinarian.update({ where: { id }, data: vetUpdate });
    }

    revalidatePath("/admin/usuarios");
    revalidatePath(`/admin/usuarios/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function resetVetPasswordAction(
  vetId: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureAdmin();
  const id = (vetId ?? "").trim();
  if (!id) return { ok: false, error: "Vet inválido." };
  if (!newPassword || newPassword.length < 4)
    return { ok: false, error: "La contraseña debe tener al menos 4 caracteres." };

  const vet = await prisma.veterinarian.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!vet) return { ok: false, error: "Veterinario no encontrado." };

  const hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: vet.userId },
    data: { passwordHash: hash },
  });
  return { ok: true };
}

export async function updateVetWorkingHoursAction(
  vetId: string,
  rows: {
    dayOfWeek: number;
    isWorking: boolean;
    startMinutes: number;
    endMinutes: number;
  }[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureAdmin();
  const id = (vetId ?? "").trim();
  if (!id) return { ok: false, error: "Vet inválido." };

  const vet = await prisma.veterinarian.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!vet) return { ok: false, error: "Veterinario no encontrado." };

  // Whitelist + clamp: dayOfWeek 0..6, minutes 0..1440, end > start.
  for (const r of rows) {
    if (
      !Number.isInteger(r.dayOfWeek) ||
      r.dayOfWeek < 0 ||
      r.dayOfWeek > 6 ||
      r.startMinutes < 0 ||
      r.startMinutes > 1440 ||
      r.endMinutes < 0 ||
      r.endMinutes > 1440
    )
      return { ok: false, error: "Horario inválido." };
    if (r.isWorking && r.endMinutes <= r.startMinutes)
      return {
        ok: false,
        error: `La hora de fin debe ser mayor que la de inicio (día ${r.dayOfWeek}).`,
      };
  }

  await prisma.$transaction(
    rows.map((r) =>
      prisma.vetWorkingHours.upsert({
        where: {
          vetId_dayOfWeek: { vetId: id, dayOfWeek: r.dayOfWeek },
        },
        update: {
          isWorking: r.isWorking,
          startMinutes: r.startMinutes,
          endMinutes: r.endMinutes,
        },
        create: {
          vetId: id,
          dayOfWeek: r.dayOfWeek,
          isWorking: r.isWorking,
          startMinutes: r.startMinutes,
          endMinutes: r.endMinutes,
        },
      })
    )
  );

  revalidatePath(`/admin/usuarios/${id}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/agendar");
  return { ok: true };
}
