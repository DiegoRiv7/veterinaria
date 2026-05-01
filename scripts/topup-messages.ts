/**
 * One-shot: top up chat messages on Julio's past completed appointments
 * for the demo build. Idempotent — only inserts if Julio currently has
 * fewer than 8 messages.
 *
 * Usage:
 *   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." \
 *     npx tsx scripts/topup-messages.ts
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const CLIENT_QUESTIONS = [
  "Hola doctor, ¿el medicamento se lo doy con comida o en ayunas?",
  "Doctor, ¿cuánto tiempo después de la cirugía puedo bañarlo?",
  "Sigue rascándose mucho, ¿hay algo más que pueda hacer?",
  "¿Cuándo es la próxima dosis de la vacuna?",
  "Está comiendo poco hoy, ¿debo preocuparme?",
  "¿Le puedo dar premios durante el tratamiento?",
  "¿Cuánto tiempo dura el efecto de la pipeta?",
];
const CLIENT_THANKS = [
  "Muchas gracias por la atención hoy 🙏",
  "Quedó muy bien, gracias doctor.",
  "Mil gracias, está mucho mejor.",
];
const VET_REPLIES = [
  "Después de comer, así evitamos molestias estomacales.",
  "Espera al menos 7 días después de la cirugía.",
  "Si en 3 días no mejora, tráelo de vuelta.",
  "La próxima dosis es en 12 meses, te avisaremos.",
  "Vigílalo 24h, si no come mañana llámame.",
  "Con gusto, cualquier cosa me avisas 🐾",
  "Sí pero solo en pequeñas cantidades.",
];

async function main() {
  const julioUser = await prisma.user.findUnique({
    where: { email: "julio.mendoza@patitasfelices.com" },
    include: { vetProfile: true },
  });
  if (!julioUser?.vetProfile) {
    console.error("Julio not found.");
    process.exit(1);
  }
  const vetId = julioUser.vetProfile.id;
  const userId = julioUser.id;

  const existing = await prisma.message.count({
    where: { appointment: { vetId } },
  });
  if (existing >= 8) {
    console.log(`Skipping: Julio already has ${existing} messages.`);
    return;
  }

  // Wipe existing julio messages (if few) so we don't duplicate
  await prisma.message.deleteMany({ where: { appointment: { vetId } } });

  const completed = await prisma.appointment.findMany({
    where: { vetId, status: "COMPLETED" },
    orderBy: { scheduledAt: "desc" },
    take: 8,
  });

  let unread = 0;

  // 2 fresh unread (client messaged recently)
  for (let i = 0; i < Math.min(2, completed.length); i++) {
    const a = completed[i];
    await prisma.message.create({
      data: {
        appointmentId: a.id,
        senderId: a.clientId,
        body: pick(CLIENT_QUESTIONS),
        createdAt: new Date(Date.now() - randInt(20, 90) * 60 * 1000),
        readAt: null,
      },
    });
    unread++;
  }

  // 6 older threads, all read, with a vet reply + maybe a "thanks"
  for (let i = 2; i < Math.min(8, completed.length); i++) {
    const a = completed[i];
    const baseTime = new Date(a.scheduledAt.getTime() + 24 * 3600 * 1000);
    await prisma.message.create({
      data: {
        appointmentId: a.id,
        senderId: a.clientId,
        body: pick(CLIENT_QUESTIONS),
        createdAt: baseTime,
        readAt: new Date(baseTime.getTime() + 30 * 60 * 1000),
      },
    });
    await prisma.message.create({
      data: {
        appointmentId: a.id,
        senderId: userId,
        body: pick(VET_REPLIES),
        createdAt: new Date(baseTime.getTime() + 60 * 60 * 1000),
        readAt: new Date(baseTime.getTime() + 90 * 60 * 1000),
      },
    });
    if (Math.random() < 0.6) {
      await prisma.message.create({
        data: {
          appointmentId: a.id,
          senderId: a.clientId,
          body: pick(CLIENT_THANKS),
          createdAt: new Date(baseTime.getTime() + 120 * 60 * 1000),
          readAt: new Date(baseTime.getTime() + 130 * 60 * 1000),
        },
      });
    }
  }

  // One fresh unread on today's first scheduled
  const todayBase = new Date();
  todayBase.setHours(0, 0, 0, 0);
  const todayScheduled = await prisma.appointment.findMany({
    where: { vetId, status: "SCHEDULED", scheduledAt: { gte: todayBase } },
    orderBy: { scheduledAt: "asc" },
    take: 1,
  });
  for (const a of todayScheduled) {
    await prisma.message.create({
      data: {
        appointmentId: a.id,
        senderId: a.clientId,
        body: "Buen día doctor, ¿debo llevarlo en ayunas?",
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        readAt: null,
      },
    });
    unread++;
  }

  console.log(`Done. ${unread} unread messages, others marked read.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
