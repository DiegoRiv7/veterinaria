/**
 * One-shot route to load demo data for the logged-in user.
 *
 * Visit:  /api/dev/seed-demo
 *
 * Auth: must be logged in as diegoriv10@gmail.com OR an ADMIN.
 * Idempotent: looks for an existing tagged appointment and skips.
 *
 * Remove this route after the demo data is loaded.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET_EMAIL = "diegoriv10@gmail.com";
const TARGET_PET_NAME = "Conejito";
const TAG_PAST = "DEMO_SEED_DIEGO";
const TAG_FUTURE = "DEMO_SEED_DIEGO_FUTURE";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Inicia sesión primero." }, { status: 401 });
  }

  const requester = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, role: true },
  });
  if (!requester) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 401 });
  }

  const isOwner = requester.email === TARGET_EMAIL;
  const isAdmin = requester.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    return NextResponse.json(
      { error: `No existe usuario con email ${TARGET_EMAIL}` },
      { status: 404 }
    );
  }

  const pet = await prisma.pet.findFirst({
    where: { ownerId: user.id, name: TARGET_PET_NAME },
  });
  if (!pet) {
    return NextResponse.json(
      { error: `${TARGET_EMAIL} no tiene mascota llamada "${TARGET_PET_NAME}"` },
      { status: 404 }
    );
  }

  // Find any vet — prefer one named "Julio" if it exists, otherwise the
  // first one we can find. This avoids hardcoding an email that may not
  // exist in this database.
  const vetCandidates = await prisma.veterinarian.findMany({
    include: { user: true },
    take: 20,
  });
  if (vetCandidates.length === 0) {
    return NextResponse.json(
      { error: "No hay veterinarios registrados en la base de datos." },
      { status: 500 }
    );
  }
  const julio =
    vetCandidates.find((v) => /julio/i.test(v.user.name)) ?? vetCandidates[0];

  // Past appointment idempotency
  const existingPast = await prisma.appointment.findFirst({
    where: { petId: pet.id, vetNotes: { contains: TAG_PAST } },
  });

  const vacService =
    (await prisma.service.findFirst({ where: { name: "Vacunación" } })) ??
    (await prisma.service.findFirst());
  if (!vacService) {
    return NextResponse.json(
      { error: "No hay servicios en la base de datos." },
      { status: 500 }
    );
  }
  const consultaService =
    (await prisma.service.findFirst({ where: { name: "Consulta general" } })) ??
    vacService;

  // 9 days ago, 11:00 local
  const at = new Date();
  at.setDate(at.getDate() - 9);
  at.setHours(11, 0, 0, 0);

  const vetNotes = `Paciente en buen estado general. Pelaje limpio y brillante, mucosas rosadas, hidratación adecuada. Peso estable respecto a la consulta anterior. Se aplica vacuna VHD anual sin reacción adversa. Se recomienda seguir con calendario de desparasitación cada 3 meses.

[${TAG_PAST}]`;

  const instructions = `Mantener al paciente en un ambiente tranquilo durante las próximas 24 horas. Vigilar el sitio de la inyección por posible inflamación leve. Ofrecer agua fresca y heno de calidad ad libitum. Si hay decaimiento marcado, falta de apetito por más de 24h o cualquier reacción inusual, contactar de inmediato.`;

  const medications = `Antiparasitario externo (pipeta) — aplicar una dosis ahora y repetir en 30 días.
Probiótico veterinario para conejos — 1 sobre diario por 7 días, mezclado con su comida habitual.
Vitamina C suplementaria — opcional, 1 tableta masticable cada tercer día.`;

  const appt = existingPast
    ? existingPast
    : await prisma.appointment.create({
        data: {
          petId: pet.id,
          clientId: user.id,
          vetId: julio.id,
          serviceId: vacService.id,
          scheduledAt: at,
          durationMinutes: vacService.durationMinutes,
          priceEstimate: vacService.basePrice,
          status: "COMPLETED",
          vetNotes,
          instructions,
          medications,
        },
      });

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

  // Only seed messages if past appt was just created (avoid duplicates).
  let messagesAdded = 0;
  if (!existingPast) {
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
      messagesAdded++;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Future appointment (5 days from now, 10:30am)
  // ──────────────────────────────────────────────────────────────
  const existingFuture = await prisma.appointment.findFirst({
    where: { petId: pet.id, vetNotes: { contains: TAG_FUTURE } },
  });

  let futureApptId: string | null = existingFuture?.id ?? null;
  if (!existingFuture) {
    const futureAt = new Date();
    futureAt.setDate(futureAt.getDate() + 5);
    futureAt.setHours(10, 30, 0, 0);

    const future = await prisma.appointment.create({
      data: {
        petId: pet.id,
        clientId: user.id,
        vetId: julio.id,
        serviceId: consultaService.id,
        scheduledAt: futureAt,
        durationMinutes: consultaService.durationMinutes,
        priceEstimate: consultaService.basePrice,
        status: "SCHEDULED",
        clientNotes: `Quisiera revisar a ${pet.name}, ha estado un poco más callado de lo normal estos días. Sin otros síntomas.

[${TAG_FUTURE}]`,
      },
    });
    futureApptId = future.id;
  }

  return NextResponse.json({
    ok: true,
    message: "Datos demo listos.",
    pastAppointmentId: appt.id,
    pastWasNew: !existingPast,
    futureAppointmentId: futureApptId,
    futureWasNew: !existingFuture,
    petName: pet.name,
    vetName: julio.user.name,
    pastScheduledAt: at.toISOString(),
    messagesAdded,
  });
}
