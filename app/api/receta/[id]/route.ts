import { createElement, type ReactElement } from "react";
import { Readable } from "node:stream";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToStream, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { RecetaPDF } from "@/components/RecetaPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache the logo bytes for the lifetime of the lambda — they never change.
let cachedLogo: Buffer | null = null;
async function loadBrandLogo(): Promise<Buffer | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const file = path.join(process.cwd(), "public", "vetsfriend-icon-192.png");
    cachedLogo = await readFile(file);
    return cachedLogo;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await readSession();
  if (!session) {
    return new Response("UNAUTHORIZED", { status: 401 });
  }

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      pet: true,
      service: true,
      client: true,
      vet: { include: { user: true } },
    },
  });

  if (!appt) {
    return new Response("NOT_FOUND", { status: 404 });
  }

  // Authorization: ADMIN, the appointment's vet (by user id), or the client.
  const isAdmin = session.role === "ADMIN";
  const isAssignedVet =
    session.role === "VET" && appt.vet.userId === session.userId;
  const isOwnerClient =
    session.role === "CLIENT" && appt.clientId === session.userId;

  if (!isAdmin && !isAssignedVet && !isOwnerClient) {
    return new Response("FORBIDDEN", { status: 403 });
  }

  const logo = await loadBrandLogo();

  const element = createElement(RecetaPDF, {
    logo,
    data: {
      id: appt.id,
      scheduledAt: appt.scheduledAt,
      vetNotes: appt.vetNotes,
      instructions: appt.instructions,
      medications: appt.medications,
      service: { name: appt.service.name },
      pet: {
        name: appt.pet.name,
        species: appt.pet.species,
        breed: appt.pet.breed,
        birthDate: appt.pet.birthDate,
        sex: appt.pet.sex,
        weightKg: appt.pet.weightKg,
        color: appt.pet.color,
        microchipId: appt.pet.microchipId,
      },
      client: {
        name: appt.client.name,
        phone: appt.client.phone,
      },
      vet: {
        user: {
          name: appt.vet.user.name,
          email: appt.vet.user.email,
        },
        bio: appt.vet.bio,
      },
    },
  });

  // RecetaPDF returns a <Document>, but its outer prop type doesn't match
  // DocumentProps. Cast through unknown for renderToStream.
  const stream = await renderToStream(
    element as unknown as ReactElement<DocumentProps>
  );

  const safePetName =
    appt.pet.name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase() || "mascota";

  const webStream = Readable.toWeb(stream as Readable) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="receta-${safePetName}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
