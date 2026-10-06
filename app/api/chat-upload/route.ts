import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Adjuntos del chat (fotos y documentos). El archivo viaja como data URL
 * dentro del mensaje — mismo esquema que las fotos de mascotas.
 */

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);
const MAX_BYTES = 2_500_000; // ~2.5MB

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  const appointmentId = String(formData.get("appointmentId") ?? "").trim();
  const caption = String(formData.get("body") ?? "").trim().slice(0, 2000);

  if (!appointmentId) {
    return NextResponse.json({ error: "Cita inválida." }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  const blob = file as Blob & { name?: string; type?: string };
  const mime = (blob.type ?? "").toLowerCase();
  if (!ALLOWED.has(mime)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usa JPG, PNG, WEBP, GIF o PDF." },
      { status: 400 }
    );
  }
  if (!blob.size || blob.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 2.5MB." },
      { status: 400 }
    );
  }

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { vet: { select: { userId: true } } },
  });
  if (!appt) {
    return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });
  }
  const allowed =
    session.role === "ADMIN" ||
    session.userId === appt.clientId ||
    session.userId === appt.vet.userId;
  if (!allowed) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  const name = (blob.name ?? "archivo").slice(0, 120);

  await prisma.message.create({
    data: {
      appointmentId,
      senderId: session.userId,
      body: caption,
      attachmentUrl: dataUrl,
      attachmentName: name,
      attachmentType: mime,
    },
  });

  revalidatePath(`/cita/${appointmentId}`);
  revalidatePath(`/vet/cita/${appointmentId}`);
  revalidatePath("/vet/chat");
  return NextResponse.json({ ok: true });
}
