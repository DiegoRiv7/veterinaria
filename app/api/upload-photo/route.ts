import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2MB raw before base64 expansion

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
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  const blob = file as Blob & { name?: string; type?: string };
  const mime = (blob.type ?? "").toLowerCase();
  if (!ALLOWED.has(mime)) {
    return NextResponse.json(
      { error: "Tipo de imagen no permitido. Usa JPG, PNG, WEBP o GIF." },
      { status: 400 }
    );
  }

  const size = blob.size ?? 0;
  if (size <= 0) {
    return NextResponse.json({ error: "Archivo vacío." }, { status: 400 });
  }
  if (size > MAX_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera el límite de 2MB." },
      { status: 400 }
    );
  }

  const petIdRaw = formData.get("petId");
  const petId = typeof petIdRaw === "string" && petIdRaw.trim() ? petIdRaw.trim() : null;
  const vetIdRaw = formData.get("vetId");
  const vetId = typeof vetIdRaw === "string" && vetIdRaw.trim() ? vetIdRaw.trim() : null;
  const userIdRaw = formData.get("userId");
  const userIdParam = typeof userIdRaw === "string" && userIdRaw.trim() ? userIdRaw.trim() : null;

  if (petId) {
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) return NextResponse.json({ error: "Mascota no encontrada." }, { status: 404 });
    if (pet.ownerId !== session.userId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  if (vetId) {
    const vet = await prisma.veterinarian.findUnique({ where: { id: vetId } });
    if (!vet) return NextResponse.json({ error: "Veterinario no encontrado." }, { status: 404 });
    const isOwner = vet.userId === session.userId;
    const isAdmin = session.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  if (userIdParam) {
    if (userIdParam !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

  if (petId) {
    try {
      await prisma.pet.update({ where: { id: petId }, data: { photoUrl: dataUrl } });
    } catch (err) {
      console.error("upload-photo db update failed", err);
      return NextResponse.json(
        { error: "No se pudo guardar la foto." },
        { status: 500 }
      );
    }
  }

  if (vetId) {
    try {
      await prisma.veterinarian.update({
        where: { id: vetId },
        data: { photoUrl: dataUrl },
      });
    } catch (err) {
      console.error("upload-photo vet db update failed", err);
      return NextResponse.json(
        { error: "No se pudo guardar la foto." },
        { status: 500 }
      );
    }
  }

  if (userIdParam) {
    try {
      await prisma.user.update({
        where: { id: userIdParam },
        data: { photoUrl: dataUrl },
      });
    } catch (err) {
      console.error("upload-photo user db update failed", err);
      return NextResponse.json(
        { error: "No se pudo guardar la foto." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ url: dataUrl });
}
