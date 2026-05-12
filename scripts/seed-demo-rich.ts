/**
 * Rich demo seed for the admin sales pitch.
 *
 * Augments the database with months of realistic activity so the admin
 * dashboard, /admin/clientes, /admin/usuarios and reports look full
 * when shown to a prospect. Idempotent-ish: skips months that already
 * have enough data so it's safe to run twice.
 *
 *   npx tsx scripts/seed-demo-rich.ts
 *
 * What it does:
 *   - Adds 4 aesthetic services if missing (baño tradicional, corte +
 *     baño, corte de uñas, spa) so the clínico/estético split has
 *     visible variety.
 *   - Ensures every veterinarian has their working hours (Lun–Sáb 9–18
 *     by default) so /admin/usuarios/[id] shows the weekly agenda
 *     already filled in.
 *   - Adds 1–2 extra pets to clients that only have one, so several
 *     households show multiple mascotas.
 *   - Seeds ~40 appointments in the current month plus ~28/month for
 *     the previous 11 months — distributed across all vets and
 *     services, with realistic completed/cancelled/no-show mix in past
 *     months and SCHEDULED for the future.
 *   - Sets prices using the species price modifier so revenue numbers
 *     line up with what the system would have generated organically.
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

type Species = "DOG" | "CAT" | "BIRD" | "RABBIT" | "HAMSTER" | "REPTILE" | "OTHER";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

const NEW_AESTHETIC_SERVICES = [
  {
    name: "Baño tradicional",
    description: "Baño con shampoo hipoalergénico y secado completo.",
    basePrice: 250,
    durationMinutes: 45,
  },
  {
    name: "Corte de pelo y baño",
    description: "Corte profesional acompañado de baño completo.",
    basePrice: 450,
    durationMinutes: 75,
  },
  {
    name: "Corte de uñas",
    description: "Recorte y limado de uñas.",
    basePrice: 80,
    durationMinutes: 15,
  },
  {
    name: "Spa completo",
    description: "Baño + corte de pelo + uñas + limpieza de oídos.",
    basePrice: 700,
    durationMinutes: 90,
  },
];

const EXTRA_PETS_POOL: {
  name: string;
  species: Species;
  breed: string;
  color: string;
  weightKg: number;
  sex: "MALE" | "FEMALE";
  ageMonths: number;
}[] = [
  { name: "Toby", species: "DOG", breed: "Beagle", color: "tricolor", weightKg: 10, sex: "MALE", ageMonths: 36 },
  { name: "Mia", species: "CAT", breed: "Doméstico", color: "atigrado", weightKg: 3.8, sex: "FEMALE", ageMonths: 24 },
  { name: "Coco", species: "DOG", breed: "Schnauzer", color: "negro", weightKg: 8.5, sex: "FEMALE", ageMonths: 48 },
  { name: "Pelusa", species: "RABBIT", breed: "Belier", color: "blanco", weightKg: 2.1, sex: "FEMALE", ageMonths: 14 },
  { name: "Bruno", species: "DOG", breed: "Bulldog francés", color: "atigrado", weightKg: 11, sex: "MALE", ageMonths: 42 },
  { name: "Pepe", species: "BIRD", breed: "Canario", color: "amarillo", weightKg: 0.025, sex: "MALE", ageMonths: 12 },
];

const NOTES_BY_SERVICE: Record<string, string[]> = {
  "Consulta general": [
    "Examen de rutina. Estado general bueno. Próxima visita en 6 meses.",
    "Sin anomalías detectadas. Continuar dieta y rutina actual.",
    "Peso ligeramente arriba del rango ideal, ajustar porciones.",
    "Revisión completa. Recomendación de ejercicio diario.",
  ],
  "Vacunación": [
    "Vacuna pentavalente aplicada. Sin reacciones adversas.",
    "Antirrábica aplicada. Refuerzo en 12 meses.",
    "Vacuna múltiple aplicada correctamente. Vigilar zona 24h.",
  ],
  "Desparasitación": [
    "Tratamiento antiparasitario interno administrado. Repetir en 3 meses.",
    "Pipeta antipulgas aplicada. Vigilar primeras 24h.",
  ],
  "Operación menor": [
    "Sutura realizada en zona afectada. 7 puntos. Curar diariamente.",
    "Procedimiento sin complicaciones. Reposo por 7 días.",
  ],
  "Operación mayor": [
    "Esterilización completada sin complicaciones. Recuperación en proceso.",
    "Cirugía ortopédica exitosa. Control en 14 días.",
  ],
  "Estética / baño": [
    "Baño y corte de pelaje. Sin observaciones.",
    "Limpieza de oídos y corte de uñas realizados.",
  ],
  "Baño tradicional": [
    "Baño completo realizado. Sin novedad.",
    "Pelaje en buen estado, baño finalizado.",
  ],
  "Corte de pelo y baño": [
    "Corte estilo personalizado solicitado. Quedó satisfecho el dueño.",
    "Corte sanitario + baño completo. Sin observaciones.",
  ],
  "Corte de uñas": ["Uñas recortadas y limadas. Sin sangrado."],
  "Spa completo": [
    "Servicio completo realizado: baño, corte, uñas y oídos.",
    "Cliente satisfecho. Mascota en excelente estado.",
  ],
  Urgencia: [
    "Estabilizado. Se prescribe medicación. Volver en 48h si no mejora.",
    "Cuadro de gastroenteritis controlado. Continuar tratamiento.",
  ],
};
const INSTRUCTIONS_POOL = [
  "Reposo 24 horas. No mojar la zona.",
  "Continuar con dieta blanda 3 días.",
  "Vigilar apetito. Llamar si no come en 24h.",
  "Aplicar pomada en la zona cada 8 horas.",
  "Mantener actividad limitada por 7 días.",
  "",
];
const MEDS_POOL = [
  "Amoxicilina 250mg cada 8h por 7 días.",
  "Meloxicam 0.1mg/kg cada 24h por 5 días.",
  "Apoquel 5.4mg cada 24h.",
  "Pomada de hidrocortisona 2 veces al día.",
  "Suplemento condroprotector cada 24h por 30 días.",
  "",
];

function notesFor(serviceName: string) {
  const list = NOTES_BY_SERVICE[serviceName] ?? [];
  return list.length ? pick(list) : "";
}

async function main() {
  console.log("🐾 Sembrando datos demo enriquecidos…\n");

  /* ── 1. Ensure aesthetic variety ───────────────────── */
  let svcAdded = 0;
  for (const s of NEW_AESTHETIC_SERVICES) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.service.create({ data: { ...s, category: "AESTHETIC" } });
      svcAdded++;
    }
  }
  console.log(`Servicios estéticos: +${svcAdded} agregados.`);

  /* ── 2. Working hours for every vet ────────────────── */
  const vets = await prisma.veterinarian.findMany({
    include: { user: { select: { id: true, name: true } }, workingHours: true },
  });
  if (vets.length === 0) {
    console.error("❌ No hay veterinarios en la BD. Corre primero `npx prisma db seed`.");
    return;
  }
  let whAdded = 0;
  for (const v of vets) {
    if (v.workingHours.length > 0) continue;
    // Default Mon–Sat 9–18, Sun off
    await prisma.$transaction(
      [1, 2, 3, 4, 5, 6, 0].map((dow) =>
        prisma.vetWorkingHours.upsert({
          where: { vetId_dayOfWeek: { vetId: v.id, dayOfWeek: dow } },
          update: {},
          create: {
            vetId: v.id,
            dayOfWeek: dow,
            isWorking: dow !== 0,
            startMinutes: 9 * 60,
            endMinutes: 18 * 60,
          },
        })
      )
    );
    whAdded++;
  }
  console.log(`Horarios semanales: +${whAdded} vets recibieron agenda 9–18 Lun–Sáb.`);

  /* ── 3. Top up pets for households that only have one ── */
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    include: { pets: true },
  });
  if (clients.length === 0) {
    console.error("❌ No hay clientes en la BD.");
    return;
  }

  let petsAdded = 0;
  const candidates = clients.filter((c) => c.pets.length === 1).slice(0, 3);
  const extraPool = [...EXTRA_PETS_POOL];
  for (const c of candidates) {
    if (extraPool.length === 0) break;
    const p = extraPool.shift()!;
    const dup = await prisma.pet.findFirst({
      where: { ownerId: c.id, name: p.name },
    });
    if (dup) continue;
    const birthDate = new Date(Date.now() - p.ageMonths * 30 * 24 * 3600 * 1000);
    await prisma.pet.create({
      data: {
        ownerId: c.id,
        name: p.name,
        species: p.species,
        breed: p.breed,
        color: p.color,
        weightKg: p.weightKg,
        sex: p.sex,
        sterilized: true,
        birthDate,
      },
    });
    petsAdded++;
  }
  console.log(`Mascotas extra: +${petsAdded} para hogares con una sola.`);

  /* ── 4. Appointment activity per month ─────────────── */
  const clientsRich = await prisma.user.findMany({
    where: { role: "CLIENT" },
    include: { pets: { select: { id: true, species: true, name: true } } },
  });
  const clientsWithPets = clientsRich.filter((c) => c.pets.length > 0);

  const services = await prisma.service.findMany();
  const mods = await prisma.speciesPriceModifier.findMany();
  const modMap = new Map(mods.map((m) => [m.species, m.multiplier]));

  // Weighted service pool — favor clínicos but include estéticos
  const SERVICE_WEIGHTS: Record<string, number> = {
    "Consulta general": 28,
    "Vacunación": 18,
    "Desparasitación": 10,
    "Operación menor": 7,
    "Operación mayor": 4,
    "Estética / baño": 8,
    "Urgencia": 7,
    "Baño tradicional": 8,
    "Corte de pelo y baño": 6,
    "Corte de uñas": 3,
    "Spa completo": 4,
  };
  const weightedServices: { service: (typeof services)[number]; weight: number }[] = services
    .map((s) => ({ service: s, weight: SERVICE_WEIGHTS[s.name] ?? 5 }))
    .filter((x) => x.weight > 0);
  const totalWeight = weightedServices.reduce((acc, x) => acc + x.weight, 0);
  function pickService() {
    let r = Math.random() * totalWeight;
    for (const item of weightedServices) {
      r -= item.weight;
      if (r <= 0) return item.service;
    }
    return weightedServices[0].service;
  }

  const now = new Date();
  const currentMonth = startOfMonth(now);

  // For the current month, evaluate COMPLETED specifically so a demo lands
  // on a dashboard with real revenue, not just future SCHEDULED.
  async function countByStatus(start: Date, end: Date) {
    const all = await prisma.appointment.findMany({
      where: { scheduledAt: { gte: start, lt: end } },
      select: { status: true },
    });
    return {
      total: all.length,
      completed: all.filter((a) => a.status === "COMPLETED").length,
      scheduled: all.filter((a) => a.status === "SCHEDULED").length,
    };
  }

  let totalCreated = 0;
  for (let i = 11; i >= 0; i--) {
    const monthStart = addMonths(currentMonth, -i);
    const monthEnd = addMonths(monthStart, 1);
    const isCurrent = monthStart.getTime() === currentMonth.getTime();

    const stats = await countByStatus(monthStart, monthEnd);

    // Current month gets a deliberate two-pass fill: past days target
    // ~28 completed (so dashboard shows real revenue) and future days
    // target ~18 scheduled (so the agenda looks busy). Past months use
    // a single random fill with the historical completion mix.
    if (isCurrent) {
      const completedTarget = 28;
      const scheduledTarget = 18;
      const needCompleted = Math.max(0, completedTarget - stats.completed);
      const needScheduled = Math.max(0, scheduledTarget - stats.scheduled);

      if (needCompleted === 0 && needScheduled === 0) {
        const key = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
        console.log(
          `Mes ${key}: ${stats.completed} atendidas + ${stats.scheduled} programadas, OK.`
        );
        continue;
      }

      const todayDay = now.getDate();
      let createdHere = 0;

      // Past days of the month — bias toward COMPLETED
      let attemptsPast = 0;
      while (createdHere < needCompleted && attemptsPast < needCompleted * 5) {
        attemptsPast++;
        const day = randInt(1, Math.max(1, todayDay - 1));
        const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
        if (date.getDay() === 0) continue;
        const hour = pick([9, 10, 11, 12, 13, 14, 15, 16, 17]);
        const minute = pick([0, 30]);
        date.setHours(hour, minute, 0, 0);
        if (date.getTime() >= now.getTime()) continue;

        const vet = pick(vets);
        const client = pick(clientsWithPets);
        const pet = pick(client.pets);
        const service = pickService();
        const mod = modMap.get(pet.species as Species) ?? 1;
        const price = Math.round(service.basePrice * mod);
        const r = Math.random();
        const status: "COMPLETED" | "CANCELLED" | "NO_SHOW" =
          r < 0.9 ? "COMPLETED" : r < 0.96 ? "CANCELLED" : "NO_SHOW";

        try {
          await prisma.appointment.create({
            data: {
              vetId: vet.id,
              clientId: client.id,
              petId: pet.id,
              serviceId: service.id,
              durationMinutes: service.durationMinutes,
              priceEstimate: price,
              scheduledAt: date,
              status,
              vetNotes: status === "COMPLETED" ? notesFor(service.name) || null : null,
              instructions:
                status === "COMPLETED" ? pick(INSTRUCTIONS_POOL) || null : null,
              medications:
                status === "COMPLETED" ? pick(MEDS_POOL) || null : null,
            },
          });
          if (status === "COMPLETED") createdHere++;
        } catch {
          // overlap — skip
        }
      }

      // Future days of the month — all SCHEDULED
      let createdFuture = 0;
      let attemptsFut = 0;
      const lastDay = daysInMonth(monthStart);
      while (createdFuture < needScheduled && attemptsFut < needScheduled * 5) {
        attemptsFut++;
        const day = randInt(todayDay + 1, lastDay);
        const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
        if (date.getDay() === 0) continue;
        const hour = pick([9, 10, 11, 12, 13, 14, 15, 16, 17]);
        const minute = pick([0, 30]);
        date.setHours(hour, minute, 0, 0);

        const vet = pick(vets);
        const client = pick(clientsWithPets);
        const pet = pick(client.pets);
        const service = pickService();
        const mod = modMap.get(pet.species as Species) ?? 1;
        const price = Math.round(service.basePrice * mod);

        try {
          await prisma.appointment.create({
            data: {
              vetId: vet.id,
              clientId: client.id,
              petId: pet.id,
              serviceId: service.id,
              durationMinutes: service.durationMinutes,
              priceEstimate: price,
              scheduledAt: date,
              status: "SCHEDULED",
            },
          });
          createdFuture++;
        } catch {
          // overlap — skip
        }
      }

      const key = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
      console.log(
        `Mes ${key}: +${createdHere} atendidas (días pasados) + ${createdFuture} programadas (días futuros).`
      );
      totalCreated += createdHere + createdFuture;
      continue;
    }

    // Past month — single random fill (existing behavior).
    const target = 28;
    if (stats.total >= Math.floor(target * 0.75)) {
      const key = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
      console.log(`Mes ${key}: ya tiene ${stats.total} citas, OK.`);
      continue;
    }
    const toCreate = target - stats.total;
    const days = daysInMonth(monthStart);

    let createdThisMonth = 0;
    let attempts = 0;
    while (createdThisMonth < toCreate && attempts < toCreate * 3) {
      attempts++;
      const day = randInt(1, days);
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      // Skip Sundays
      if (date.getDay() === 0) continue;

      const hour = pick([9, 10, 11, 12, 13, 14, 15, 16, 17]);
      const minute = pick([0, 30]);
      date.setHours(hour, minute, 0, 0);

      const vet = pick(vets);
      const client = pick(clientsWithPets);
      const pet = pick(client.pets);
      const service = pickService();
      const mod = modMap.get(pet.species as Species) ?? 1;
      const price = Math.round(service.basePrice * mod);

      const isPast = date.getTime() < now.getTime();
      let status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
      if (isPast) {
        const r = Math.random();
        status = r < 0.87 ? "COMPLETED" : r < 0.94 ? "CANCELLED" : "NO_SHOW";
      } else {
        status = "SCHEDULED";
      }

      try {
        await prisma.appointment.create({
          data: {
            vetId: vet.id,
            clientId: client.id,
            petId: pet.id,
            serviceId: service.id,
            durationMinutes: service.durationMinutes,
            priceEstimate: price,
            scheduledAt: date,
            status,
            vetNotes:
              status === "COMPLETED" ? notesFor(service.name) || null : null,
            instructions:
              status === "COMPLETED" ? pick(INSTRUCTIONS_POOL) || null : null,
            medications:
              status === "COMPLETED" ? pick(MEDS_POOL) || null : null,
          },
        });
        createdThisMonth++;
      } catch {
        // overlap or transient — skip and continue
      }
    }
    const key = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
    console.log(`Mes ${key}: +${createdThisMonth} citas creadas.`);
    totalCreated += createdThisMonth;
  }

  console.log(`\n✅ Total citas creadas en esta corrida: ${totalCreated}.`);
  console.log(`\nPróximos pasos:`);
  console.log(`  1. Levanta el server (npm run dev) y entra como admin@patitasfelices.com / admin123`);
  console.log(`  2. /admin debería mostrar KPIs con números reales del mes actual`);
  console.log(`  3. /admin/clientes y /admin/usuarios listan a los clientes/vets con stats`);
  console.log(`  4. Exportá a Excel desde el dashboard para ver el archivo multi-hoja completo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
