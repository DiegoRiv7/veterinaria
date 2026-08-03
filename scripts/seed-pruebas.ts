/**
 * Seed de pruebas: llena la agenda alrededor de HOY.
 *
 * Pensado para probar /vet/hoy, /vet/calendario, /vet/historial y los
 * pasaportes con datos frescos, sin importar cuándo se corra:
 *
 *   - 3 clientes nuevos con 5 mascotas (si no existen).
 *   - Vacunas y desparasitaciones para 2 de esas mascotas.
 *   - Citas de HOY para cada vet: completadas en la mañana (con notas,
 *     indicaciones y medicamentos) y programadas por la tarde.
 *   - Citas de MAÑANA (programadas) para cada vet.
 *   - Citas de la última semana: completadas + 1 cancelada + 1 no-show.
 *   - 1 mensaje sin leer del cliente en una cita de hoy por vet.
 *
 * Re-ejecutable: las citas creadas aquí llevan la etiqueta [SEED-PRUEBAS]
 * en clientNotes; al volver a correr se borran y se recrean relativas a
 * la nueva fecha. Clientes/mascotas/vacunas se conservan.
 *
 *   npx tsx scripts/seed-pruebas.ts
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

const TAG = "[SEED-PRUEBAS]";
const PASSWORD = "Password123!";

type Species = "DOG" | "CAT" | "BIRD" | "RABBIT" | "HAMSTER" | "REPTILE" | "OTHER";

const NEW_CLIENTS: {
  email: string;
  name: string;
  phone: string;
  pets: { name: string; species: Species; breed: string; sex: "MALE" | "FEMALE"; birthYear: number; weightKg: number }[];
}[] = [
  {
    email: "ana.torres.demo@vetsfriend.mx",
    name: "Ana Torres",
    phone: "5559990101",
    pets: [
      { name: "Rocky", species: "DOG", breed: "Labrador", sex: "MALE", birthYear: 2022, weightKg: 28 },
      { name: "Misha", species: "CAT", breed: "Europeo", sex: "FEMALE", birthYear: 2023, weightKg: 4.2 },
    ],
  },
  {
    email: "luis.hernandez.demo@vetsfriend.mx",
    name: "Luis Hernández",
    phone: "5559990102",
    pets: [
      { name: "Pelusa", species: "CAT", breed: "Persa", sex: "FEMALE", birthYear: 2021, weightKg: 3.8 },
    ],
  },
  {
    email: "carla.jimenez.demo@vetsfriend.mx",
    name: "Carla Jiménez",
    phone: "5559990103",
    pets: [
      { name: "Toby", species: "DOG", breed: "Schnauzer", sex: "MALE", birthYear: 2020, weightKg: 9.5 },
      { name: "Nube", species: "RABBIT", breed: "Mini Lop", sex: "FEMALE", birthYear: 2024, weightKg: 1.6 },
    ],
  },
];

const VET_NOTES = [
  "Exploración general sin hallazgos relevantes. Mucosas rosadas, hidratación normal.",
  "Leve inflamación gingival; se recomienda limpieza dental en los próximos meses.",
  "Otitis externa leve en oído izquierdo. Se limpia y medica en consulta.",
  "Sobrepeso ligero; se ajusta ración diaria y se agenda control de peso.",
  "Dermatitis por pulgas en zona lumbar. Se aplica antiparasitario.",
];
const INSTRUCTIONS = [
  "Reposo relativo 48 h y agua fresca a libre acceso.",
  "Aplicar limpieza de oídos cada 3 días durante 2 semanas.",
  "Dieta light: reducir ración 15% y premios solo de vegetales.",
  "Baño medicado 1 vez por semana durante 3 semanas.",
  "Regresar a control en 15 días.",
];
const MEDICATIONS = [
  "Meloxicam 0.1 mg/kg cada 24 h por 3 días",
  "Otidex gotas, 4 gotas en oído izquierdo cada 12 h",
  "Simparica 10 mg, dosis única mensual",
  "Omeprazol 1 mg/kg en ayunas por 5 días",
  "",
];
const CLIENT_NOTES = [
  "Ha estado rascándose mucho la oreja.",
  "Come bien pero lo noto decaído.",
  "Revisión general y aplicar vacuna pendiente.",
  "Corte de uñas y revisión de piel.",
  "",
];

function at(daysFromToday: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  console.log(`[seed-pruebas] DB: ${process.env.DATABASE_URL ?? "file:./dev.db"}`);

  // ── 0. Limpia citas de corridas anteriores (recrea relativo a hoy) ──
  const removed = await prisma.appointment.deleteMany({
    where: { clientNotes: { contains: TAG } },
  });
  if (removed.count > 0) {
    console.log(`[seed-pruebas] ${removed.count} citas de una corrida anterior eliminadas.`);
  }

  // ── 1. Clientes y mascotas nuevas ──────────────────────────────────
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const petIds: { petId: string; clientId: string; species: Species; name: string }[] = [];

  for (const c of NEW_CLIENTS) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        phone: c.phone,
        name: c.name,
        passwordHash,
        role: "CLIENT",
      },
    });
    for (const p of c.pets) {
      let pet = await prisma.pet.findFirst({
        where: { ownerId: user.id, name: p.name },
      });
      if (!pet) {
        pet = await prisma.pet.create({
          data: {
            ownerId: user.id,
            name: p.name,
            species: p.species,
            breed: p.breed,
            sex: p.sex,
            birthDate: new Date(p.birthYear, 3, 15),
            weightKg: p.weightKg,
            sterilized: p.birthYear <= 2022,
          },
        });
        console.log(`[seed-pruebas] Mascota creada: ${p.name} (${c.name})`);
      }
      petIds.push({ petId: pet.id, clientId: user.id, species: p.species, name: p.name });
    }
  }

  // También usamos mascotas ya existentes para variedad
  const existingPets = await prisma.pet.findMany({
    where: { owner: { role: "CLIENT", email: { notIn: NEW_CLIENTS.map((c) => c.email) } } },
    select: { id: true, ownerId: true, species: true, name: true },
    take: 6,
    orderBy: { createdAt: "asc" },
  });
  for (const p of existingPets) {
    petIds.push({ petId: p.id, clientId: p.ownerId, species: p.species as Species, name: p.name });
  }

  // ── 2. Vets, servicios y modificadores de precio ───────────────────
  const vets = await prisma.veterinarian.findMany({ include: { user: true } });
  if (vets.length === 0) throw new Error("No hay veterinarios; corre primero prisma/seed.ts");

  const services = await prisma.service.findMany({ where: { active: true } });
  const clinical = services.filter((s) => s.category === "CLINICAL");
  const aesthetic = services.filter((s) => s.category === "AESTHETIC");
  const modifiers = new Map(
    (await prisma.speciesPriceModifier.findMany()).map((m) => [m.species as Species, m.multiplier])
  );
  const price = (base: number, species: Species) =>
    Math.round(base * (modifiers.get(species) ?? 1));

  // ── 3. Vacunas y desparasitaciones para el pasaporte ───────────────
  const vetUser = vets[0].user;
  const passportPets = petIds.filter((p) => ["Rocky", "Pelusa"].includes(p.name));
  for (const p of passportPets) {
    const count = await prisma.vaccine.count({ where: { petId: p.petId } });
    if (count === 0) {
      const isDog = p.species === "DOG";
      await prisma.vaccine.createMany({
        data: [
          {
            petId: p.petId,
            name: isDog ? "Pentavalente" : "Triple felina",
            appliedAt: daysAgo(90),
            nextAt: at(275, 12),
            weightKg: isDog ? 27.5 : 3.7,
            addedByUserId: vetUser.id,
          },
          {
            petId: p.petId,
            name: "Antirrábica",
            appliedAt: daysAgo(30),
            nextAt: at(335, 12),
            weightKg: isDog ? 28 : 3.8,
            notes: "Sin reacciones adversas.",
            addedByUserId: vetUser.id,
          },
          {
            petId: p.petId,
            name: isDog ? "Bordetella (KC)" : "Leucemia felina",
            appliedAt: daysAgo(7),
            nextAt: at(358, 12),
            weightKg: isDog ? 28.2 : 3.8,
            addedByUserId: vetUser.id,
          },
        ],
      });
      await prisma.deworming.createMany({
        data: [
          {
            petId: p.petId,
            product: isDog ? "Drontal Plus" : "Milbemax",
            kind: "Interna",
            appliedAt: daysAgo(45),
            nextAt: at(45, 12),
            notes: isDog ? "1 tableta / 10 kg" : "1/2 tableta",
            addedByUserId: vetUser.id,
          },
          {
            petId: p.petId,
            product: isDog ? "NexGard" : "Bravecto",
            kind: "Externa",
            appliedAt: daysAgo(10),
            nextAt: at(20, 12),
            addedByUserId: vetUser.id,
          },
        ],
      });
      console.log(`[seed-pruebas] Pasaporte llenado: ${p.name} (3 vacunas, 2 desparasitaciones)`);
    }
  }

  // ── 4. Citas ────────────────────────────────────────────────────────
  let created = 0;
  let petCursor = 0;
  const nextPet = () => petIds[petCursor++ % petIds.length];
  const pickService = (i: number) =>
    i % 3 === 2 && aesthetic.length > 0
      ? aesthetic[i % aesthetic.length]
      : clinical[i % clinical.length];

  async function createAppointment(opts: {
    vetIdx: number;
    when: Date;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    serviceIdx: number;
    withNotes?: boolean;
  }) {
    const vet = vets[opts.vetIdx % vets.length];
    const pet = nextPet();
    const service = pickService(opts.serviceIdx);
    const i = created;
    const appt = await prisma.appointment.create({
      data: {
        clientId: pet.clientId,
        petId: pet.petId,
        vetId: vet.id,
        serviceId: service.id,
        scheduledAt: opts.when,
        durationMinutes: service.durationMinutes,
        status: opts.status,
        priceEstimate: price(service.basePrice, pet.species),
        clientNotes: `${CLIENT_NOTES[i % CLIENT_NOTES.length]} ${TAG}`.trim(),
        ...(opts.withNotes
          ? {
              vetNotes: VET_NOTES[i % VET_NOTES.length],
              instructions: INSTRUCTIONS[i % INSTRUCTIONS.length],
              medications: MEDICATIONS[i % MEDICATIONS.length] || null,
            }
          : {}),
      },
    });
    created++;
    return appt;
  }

  // HOY: por vet, 2 completadas en la mañana + 2 programadas en la tarde
  const todayScheduled: { apptId: string; clientId: string }[] = [];
  for (let v = 0; v < vets.length; v++) {
    await createAppointment({ vetIdx: v, when: at(0, 9, v * 15), status: "COMPLETED", serviceIdx: v, withNotes: true });
    await createAppointment({ vetIdx: v, when: at(0, 10, 30), status: "COMPLETED", serviceIdx: v + 1, withNotes: true });
    const a1 = await createAppointment({ vetIdx: v, when: at(0, 16, v * 30), status: "SCHEDULED", serviceIdx: v + 2 });
    await createAppointment({ vetIdx: v, when: at(0, 18, 0), status: "SCHEDULED", serviceIdx: v + 3 });
    todayScheduled.push({ apptId: a1.id, clientId: a1.clientId });
  }

  // MAÑANA: 2 citas programadas por vet
  for (let v = 0; v < vets.length; v++) {
    await createAppointment({ vetIdx: v, when: at(1, 10, v * 20), status: "SCHEDULED", serviceIdx: v + 4 });
    await createAppointment({ vetIdx: v, when: at(1, 12, 30), status: "SCHEDULED", serviceIdx: v + 5 });
  }

  // ÚLTIMA SEMANA: completadas + 1 cancelada + 1 no-show
  for (let d = 1; d <= 6; d++) {
    await createAppointment({
      vetIdx: d,
      when: at(-d, 10, 0),
      status: "COMPLETED",
      serviceIdx: d,
      withNotes: true,
    });
    await createAppointment({
      vetIdx: d + 1,
      when: at(-d, 13, 0),
      status: d === 3 ? "CANCELLED" : d === 5 ? "NO_SHOW" : "COMPLETED",
      serviceIdx: d + 3,
      withNotes: d !== 3 && d !== 5,
    });
  }

  // ── 5. Mensajes sin leer en citas de hoy ───────────────────────────
  for (const t of todayScheduled) {
    await prisma.message.create({
      data: {
        appointmentId: t.apptId,
        senderId: t.clientId,
        body: "Hola doc, ¿sigue en pie la cita de hoy? Gracias 🙏",
      },
    });
  }

  console.log(`[seed-pruebas] ${created} citas creadas (hoy, mañana y última semana).`);
  console.log(`[seed-pruebas] ${todayScheduled.length} mensajes sin leer en citas de hoy.`);
  console.log(`[seed-pruebas] Clientes demo (password: ${PASSWORD}):`);
  for (const c of NEW_CLIENTS) console.log(`  - ${c.email}`);
  console.log("[seed-pruebas] Listo ✔");
}

main()
  .catch((err) => {
    console.error("[seed-pruebas] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
