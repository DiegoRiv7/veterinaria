/**
 * Apply default consulta templates to existing services + create the
 * services that the partnering vet asked for in his services document.
 *
 *   npx tsx scripts/seed-form-templates.ts
 *   npx tsx scripts/seed-form-templates.ts --force
 *
 * - Idempotent by default: only writes formSchema where missing, only
 *   creates services that aren't already present (matched by exact name).
 * - With --force or FORCE_FORM_TEMPLATE_REFRESH=1, refreshes the matching
 *   services so the trial database can receive the latest approved fields.
 * - Existing services keep their data; we just attach a starter schema
 *   so the new dynamic renderer has something to work with.
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import {
  templateFor,
  templateKeyForServiceName,
  type TemplateKey,
} from "../lib/form-schema";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });
const FORCE_REFRESH =
  process.argv.includes("--force") || process.env.FORCE_FORM_TEMPLATE_REFRESH === "1";

type ServiceSeed = {
  name: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  category: "CLINICAL" | "AESTHETIC";
  template: TemplateKey;
};

const VET_REQUESTED_SERVICES: ServiceSeed[] = [
  {
    name: "Vacunación",
    description: "Aplicación de biológicos según calendario.",
    basePrice: 350,
    durationMinutes: 20,
    category: "CLINICAL",
    template: "vacunacion",
  },
  {
    name: "Desparasitación interna",
    description: "Tratamiento antiparasitario interno (vía oral o inyectable).",
    basePrice: 280,
    durationMinutes: 20,
    category: "CLINICAL",
    template: "desparasitacion_interna",
  },
  {
    name: "Desparasitación externa",
    description: "Tratamiento antiparasitario externo (pulgas, garrapatas).",
    basePrice: 320,
    durationMinutes: 20,
    category: "CLINICAL",
    template: "desparasitacion_externa",
  },
  {
    name: "Estudio de laboratorio",
    description: "Toma de muestra y análisis clínicos.",
    basePrice: 600,
    durationMinutes: 30,
    category: "CLINICAL",
    template: "laboratorio",
  },
  {
    name: "Imagenología",
    description: "Radiografía, ultrasonido u otros estudios de imagen.",
    basePrice: 850,
    durationMinutes: 45,
    category: "CLINICAL",
    template: "imagenologia",
  },
  {
    name: "Consulta general",
    description: "Revisión veterinaria completa con anamnesis y examen físico.",
    basePrice: 400,
    durationMinutes: 30,
    category: "CLINICAL",
    template: "consulta",
  },
  {
    name: "Estética / baño",
    description: "Baño, corte y cuidados de pelaje.",
    basePrice: 300,
    durationMinutes: 60,
    category: "AESTHETIC",
    template: "estetica",
  },
];

async function main() {
  console.log("🐾 Sembrando templates de consulta…\n");
  if (FORCE_REFRESH) {
    console.log("  Modo refresh: se actualizarán plantillas existentes.\n");
  }

  /* ── 1. Ensure the vet's requested services exist ───────────── */
  let created = 0;
  let refreshedRequested = 0;
  for (const svc of VET_REQUESTED_SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { name: svc.name },
    });
    if (existing) {
      if (FORCE_REFRESH) {
        await prisma.service.update({
          where: { id: existing.id },
          data: { formSchema: JSON.stringify(templateFor(svc.template)) },
        });
        refreshedRequested++;
        console.log(`  ~ Actualizado: ${svc.name}`);
      }
      continue;
    }
    await prisma.service.create({
      data: {
        name: svc.name,
        description: svc.description,
        basePrice: svc.basePrice,
        durationMinutes: svc.durationMinutes,
        category: svc.category,
        formSchema: JSON.stringify(templateFor(svc.template)),
      },
    });
    created++;
    console.log(`  + Creado: ${svc.name}`);
  }
  if (created === 0) console.log("  Todos los servicios ya existían.");
  if (FORCE_REFRESH && refreshedRequested === 0) {
    console.log("  Ningún servicio solicitado necesitó refresh.");
  }

  /* ── 2. Attach a template to existing services that don't have one ── */
  const services = await prisma.service.findMany();
  let patched = 0;
  for (const s of services) {
    if (s.formSchema) continue;
    const key = templateKeyForServiceName(s.name);
    await prisma.service.update({
      where: { id: s.id },
      data: { formSchema: JSON.stringify(templateFor(key)) },
    });
    patched++;
    console.log(`  ~ Plantilla aplicada a "${s.name}" → ${key}`);
  }
  if (patched === 0) console.log("  Todos los servicios ya tenían plantilla.");

  console.log(
    `\n✅ Listo. Servicios creados: ${created}, plantillas actualizadas: ${
      refreshedRequested + patched
    }.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
