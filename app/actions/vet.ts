"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

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
  revalidatePath("/agendar");
  revalidatePath("/admin/veterinarios");
}
