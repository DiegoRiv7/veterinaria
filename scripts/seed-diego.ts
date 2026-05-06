/**
 * One-shot: load demo data for the user diegoriv10@gmail.com.
 * - Finds the user, finds the pet "Conejito", finds Dr. Julio Mendoza.
 * - Creates a single COMPLETED appointment 9 days ago with a typical
 *   "Vacunación" service, full vet notes / instructions / medications,
 *   so the receta PDF can be downloaded.
 * - Adds a short 4-message conversation between client and vet on that
 *   appointment, all marked read.
 * Idempotent: looks for an existing demo-tagged appointment and skips
 * if one already exists.
 *
 * Usage (production Turso):
 *   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." \
 *     npx tsx scripts/seed-diego.ts
 *
 * Usage (local SQLite):
 *   npx tsx scripts/seed-diego.ts
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

const TARGET_EMAIL = "diegoriv10@gmail.com";
const TARGET_PET_NAME = "Conejito";
const TAG = "DEMO_SEED_DIEGO";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    console.error(`No user with email ${TARGET_EMAIL}`);
    process.exit(1);
  }

  const pet = await prisma.pet.findFirst({
    where: { ownerId: user.id, name: TARGET_PET_NAME },
  });
  if (!pet) {
    console.error(`No pet "${TARGET_PET_NAME}" for ${TARGET_EMAIL}`);
    process.exit(1);
  }

  const julio = await prisma.veterinarian.findFirst({
    where: { user: { email: "julio.mendoza@patitasfelices.com" } },
    include: { user: true },
  });
  if (!julio) {
    console.error("No vet Julio Mendoza in DB. Run main seed first.");
    process.exit(1);
  }

  // Idempotency check
  const existing = await prisma.appointment.findFirst({
    where: { petId: pet.id, vetNotes: { contains: TAG } },
  });
  if (existing) {
    console.log(`Demo appointment already exists (${existing.id}). Nothing to do.`);
    process.exit(0);
  }

  // Pick the "Vacunación" service if it exists, else any service.
  const service =
    (await prisma.service.findFirst({ where: { name: "Vacunación" } })) ??
    (await prisma.service.findFirst());
  if (!service) {
    console.error("No services in DB. Run main seed first.");
    process.exit(1);
  }

  // 9 days ago, 11:00 local
  const at = new Date();
  at.setDate(at.getDate() - 9);
  at.setHours(11, 0, 0, 0);

  const vetNotes = `Paciente en buen estado general. Pelaje limpio y brillante, mucosas rosadas, hidratación adecuada. Peso estable respecto a la consulta anterior. Se aplica vacuna VHD anual sin reacción adversa. Se recomienda seguir con calendario de desparasitación cada 3 meses.

[${TAG}]`;

  const instructions = `Mantener al paciente en un ambiente tranquilo durante las próximas 24 horas. Vigilar el sitio de la inyección por posible inflamación leve. Ofrecer agua fresca y heno de calidad ad libitum. Si hay decaimiento marcado, falta de apetito por más de 24h o cualquier reacción inusual, contactar de inmediato.`;

  const medications = `Antiparasitario externo (pipeta) — aplicar una dosis ahora y repetir en 30 días.
Probiótico veterinario para conejos — 1 sobre diario por 7 días, mezclado con su comida habitual.
Vitamina C suplementaria — opcional, 1 tableta masticable cada tercer día.`;

  const appt = await prisma.appointment.create({
    data: {
      petId: pet.id,
      clientId: user.id,
      vetId: julio.id,
      serviceId: service.id,
      scheduledAt: at,
      durationMinutes: service.durationMinutes,
      priceEstimate: service.basePrice,
      status: "COMPLETED",
      vetNotes,
      instructions,
      medications,
    },
  });

  // Conversation: client asks, vet replies, client thanks. All read.
  const baseTs = at.getTime();
  const minute = 60_000;
  const messages = [
    {
      senderId: user.id,
      body: `Hola doctor, ¿el probiótico se lo doy en la mañana o en la noche? ${pet.name} suele desayunar a las 8.`,
      at: baseTs + 90 * minute,
    },
    {
      senderId: julio.userId,
      body: `Hola Diego, dáselo con su desayuno — el probiótico se aprovecha mejor mezclado con la comida. Mantenlo así durante los 7 días y cualquier cambio en sus heces me avisas.`,
      at: baseTs + 95 * minute,
    },
    {
      senderId: user.id,
      body: `Perfecto, mil gracias doctor. Una última pregunta: ¿puedo bañarlo esta semana o mejor espero?`,
      at: baseTs + 240 * minute,
    },
    {
      senderId: julio.userId,
      body: `Mejor espera unos 5–7 días después de la vacuna para no estresarlo. Si necesita limpieza puntual usa una toallita húmeda tibia. Cualquier duda me avisas 🐰`,
      at: baseTs + 250 * minute,
    },
  ];

  for (const m of messages) {
    await prisma.message.create({
      data: {
        appointmentId: appt.id,
        senderId: m.senderId,
        body: m.body,
        createdAt: new Date(m.at),
        readAt: new Date(m.at + 5 * minute),
      },
    });
  }

  console.log(`✓ Created completed appointment ${appt.id} for ${pet.name}`);
  console.log(`  Service: ${service.name} · Vet: ${julio.user.name}`);
  console.log(`  Scheduled at: ${at.toISOString()}`);
  console.log(`  Messages added: ${messages.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
