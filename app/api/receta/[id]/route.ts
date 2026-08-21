import { createElement, type ReactElement } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import {
  RecetaPDF,
  computeRecetaScale,
  type RecetaData,
  type RecetaSection,
} from "@/components/RecetaPDF";
import {
  parseFormSchema,
  parseConsultaData,
  isVisualOnly,
  LEGACY_FIELD_IDS,
  DEFAULT_CONSULTA_SCHEMA,
} from "@/lib/form-schema";

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

  // Secciones de la consulta que sí se llenaron, en el orden del formulario
  // del servicio. Lo vacío no aparece en la receta.
  const schema = parseFormSchema(appt.service.formSchema) ?? DEFAULT_CONSULTA_SCHEMA;
  const values = parseConsultaData(appt.consultaData);
  const consulta: RecetaSection[] = [];
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (isVisualOnly(field.type)) continue;
      // Los medicamentos van como lista numerada aparte, no como párrafo.
      if (field.id === LEGACY_FIELD_IDS.medications) continue;
      const v = values[field.id];
      let text = "";
      if (typeof v === "string") text = v.trim();
      else if (typeof v === "number") {
        text = `${v}${field.unit ? ` ${field.unit}` : ""}`;
      } else if (v === true) text = "Sí";
      else if (Array.isArray(v)) text = v.filter(Boolean).join(" · ");
      if (text) consulta.push({ label: field.label, value: text });
    }
  }
  // Citas viejas sin consultaData: usa las columnas de texto clásicas.
  if (consulta.length === 0) {
    if (appt.vetNotes?.trim()) {
      consulta.push({ label: "Diagnóstico", value: appt.vetNotes.trim() });
    }
    if (appt.instructions?.trim()) {
      consulta.push({ label: "Indicaciones", value: appt.instructions.trim() });
    }
  }

  const data: RecetaData = {
    id: appt.id,
    scheduledAt: appt.scheduledAt,
    medications: appt.medications,
    consulta,
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
      licenseNumber: appt.vet.licenseNumber,
    },
  };

  // Render adaptativo: si con la escala estimada la receta se pasa de una
  // página, se recompacta y re-renderiza (hasta un mínimo legible).
  const countPages = (buf: Buffer) =>
    (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;

  const render = (scale: number) =>
    renderToBuffer(
      // RecetaPDF returns a <Document>, but its outer prop type doesn't
      // match DocumentProps. Cast through unknown for renderToBuffer.
      createElement(RecetaPDF, { logo, data, scale }) as unknown as ReactElement<DocumentProps>
    );

  let scale = computeRecetaScale(data);
  let buffer = await render(scale);
  for (let i = 0; i < 4 && countPages(buffer) > 1 && scale > 0.66; i++) {
    scale = Math.max(0.66, scale * 0.92);
    buffer = await render(scale);
  }

  const safePetName =
    appt.pet.name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase() || "mascota";

  const body = new Uint8Array(buffer);

  return new Response(body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="receta-${safePetName}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
