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
const TAG = "DEMO_SEED_DIEGO";

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

  const julio = await prisma.veterinarian.findFirst({
    where: { user: { email: "julio.mendoza@patitasfelices.com" } },
    include: { user: true },
  });
  if (!julio) {
    return NextResponse.json(
      { error: "Falta el veterinario Julio Mendoza en la base de datos." },
      { status: 500 }
    );
  }

  // Idempotency
  const existing = await prisma.appointment.findFirst({
    where: { petId: pet.id, vetNotes: { contains: TAG } },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      message: "La cita demo ya existe, no se duplicó.",
      appointmentId: existing.id,
    });
  }

  const service =
    (await prisma.service.findFirst({ where: { name: "Vacunación" } })) ??
    (await prisma.service.findFirst());
  if (!service) {
    return NextResponse.json(
      { error: "No hay servicios en la base de datos." },
      { status: 500 }
    );
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

  return NextResponse.json({
    ok: true,
    message: "Cita demo creada con éxito.",
    appointmentId: appt.id,
    petName: pet.name,
    vetName: julio.user.name,
    scheduledAt: at.toISOString(),
    messages: messages.length,
  });
}
