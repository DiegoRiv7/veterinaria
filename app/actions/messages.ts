"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function sendMessageAction(formData: FormData) {
  const session = await requireSession();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!appointmentId || !body) throw new Error("El mensaje está vacío.");
  if (body.length > 2000) throw new Error("Mensaje muy largo (máx 2000).");

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { vet: true },
  });
  if (!appt) throw new Error("Cita no encontrada.");

  const allowed =
    session.role === "ADMIN" ||
    session.userId === appt.clientId ||
    session.userId === appt.vet.userId;
  if (!allowed) throw new Error("FORBIDDEN");

  await prisma.message.create({
    data: {
      appointmentId,
      senderId: session.userId,
      body,
    },
  });

  revalidatePath(`/cita/${appointmentId}`);
  revalidatePath(`/vet/cita/${appointmentId}`);
}
