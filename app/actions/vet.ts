"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  requireSession,
  signSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateVetPhotoAction(vetId: string, photoUrl: string | null) {
  const session = await requireSession();
  const id = (vetId ?? "").trim();
  if (!id) throw new Error("Datos inválidos.");

  const vet = await prisma.veterinarian.findUnique({ where: { id } });
  if (!vet) throw new Error("Veterinario no encontrado.");

  const isOwner = vet.userId === session.userId;
  const isAdmin = session.role === "ADMIN";
  if (!isOwner && !isAdmin) throw new Error("FORBIDDEN");

  const url =
    typeof photoUrl === "string" && photoUrl.trim().length > 0
      ? photoUrl.trim()
      : null;

  await prisma.veterinarian.update({
    where: { id },
    data: { photoUrl: url },
  });

  revalidatePath("/perfil");
  revalidatePath("/vet/perfil");
  revalidatePath("/agendar");
  revalidatePath("/admin/usuarios");
}

export type AccountUpdateResult = { ok: true } | { ok: false; error: string };

export async function updateVetAccountAction(
  _: unknown,
  formData: FormData
): Promise<AccountUpdateResult> {
  const session = await requireSession();
  if (session.role === "CLIENT") return { ok: false, error: "No autorizado." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").replace(/\D+/g, "");
  const bio = String(formData.get("bio") ?? "").trim();

  if (!name) return { ok: false, error: "El nombre no puede quedar vacío." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "El correo no es válido." };
  if (phone.length < 7) return { ok: false, error: "Ingresa un teléfono de al menos 7 dígitos." };

  const [emailHolder, phoneHolder] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { phone }, select: { id: true } }),
  ]);
  if (emailHolder && emailHolder.id !== session.userId) {
    return { ok: false, error: "Ese correo ya está en uso." };
  }
  if (phoneHolder && phoneHolder.id !== session.userId) {
    return { ok: false, error: "Ese teléfono ya está en uso." };
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.userId },
    data: { name, email, phone },
  });

  // Update vet bio if user has a vet profile
  await prisma.veterinarian.updateMany({
    where: { userId: session.userId },
    data: { bio: bio || null },
  });

  // Refresh session cookie so the sidebar/topbar pick up the new name immediately
  if (updatedUser.name !== session.name) {
    const token = await signSession({
      userId: updatedUser.id,
      role: updatedUser.role,
      name: updatedUser.name,
    });
    await setSessionCookie(token);
  }

  revalidatePath("/vet/perfil");
  revalidatePath("/vet");
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function changeVetPasswordAction(
  _: unknown,
  formData: FormData
): Promise<AccountUpdateResult> {
  const session = await requireSession();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next) return { ok: false, error: "Completa los campos de contraseña." };
  if (next.length < 6) return { ok: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
  if (next !== confirm) return { ok: false, error: "Las contraseñas no coinciden." };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { ok: false, error: "Sesión inválida." };

  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) return { ok: false, error: "Contraseña actual incorrecta." };

  const passwordHash = await hashPassword(next);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true };
}
