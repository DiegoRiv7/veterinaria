"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function updateUserPhotoAction(
  userId: string,
  photoUrl: string | null
) {
  const session = await requireSession();
  const id = (userId ?? "").trim();
  if (!id) throw new Error("Datos inválidos.");

  if (id !== session.userId && session.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  const url =
    typeof photoUrl === "string" && photoUrl.trim().length > 0
      ? photoUrl.trim()
      : null;

  await prisma.user.update({
    where: { id },
    data: { photoUrl: url },
  });

  revalidatePath("/perfil");
  revalidatePath("/inicio");
  revalidatePath("/notificaciones");
  revalidatePath("/vet/chat");
}
