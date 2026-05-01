"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function markAllNotificationsReadAction() {
  const session = await requireSession();
  if (session.role === "CLIENT") return { ok: false as const };

  await prisma.message.updateMany({
    where: {
      readAt: null,
      senderId: { not: session.userId },
      appointment: { vet: { userId: session.userId } },
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/vet");
  revalidatePath("/vet/hoy");
  revalidatePath("/vet/chat");
  return { ok: true as const };
}
