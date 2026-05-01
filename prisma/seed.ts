import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

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
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function main() {
  console.log("Seeding database...");

  /* ── Clinic schedule ─────────────────────────────── */
  for (let day = 0; day < 7; day++) {
    await prisma.clinicSchedule.upsert({
      where: { dayOfWeek: day },
      update: {},
      create: {
        dayOfWeek: day,
        isOpen: day !== 0,
        openMinutes: 9 * 60,
        closeMinutes: 18 * 60,
        slotMinutes: 30,
      },
    });
  }

  /* ── Species price modifiers ─────────────────────── */
  const speciesMods = [
    { species: "DOG" as const, multiplier: 1.0 },
    { species: "CAT" as const, multiplier: 1.0 },
    { species: "BIRD" as const, multiplier: 1.2 },
    { species: "RABBIT" as const, multiplier: 1.15 },
    { species: "HAMSTER" as const, multiplier: 1.1 },
    { species: "REPTILE" as const, multiplier: 1.3 },
    { species: "OTHER" as const, multiplier: 1.25 },
  ];
  for (const s of speciesMods) {
    await prisma.speciesPriceModifier.upsert({
      where: { species: s.species },
      update: { multiplier: s.multiplier },
      create: s,
    });
  }

  /* ── Services ────────────────────────────────────── */
  const services = [
    { name: "Consulta general", description: "Revisión veterinaria de rutina.", basePrice: 400, durationMinutes: 30 },
    { name: "Vacunación", description: "Aplicación de vacunas según calendario.", basePrice: 350, durationMinutes: 20 },
    { name: "Desparasitación", description: "Tratamiento antiparasitario interno/externo.", basePrice: 280, durationMinutes: 20 },
    { name: "Operación menor", description: "Cirugías ambulatorias (curaciones, suturas).", basePrice: 1800, durationMinutes: 60 },
    { name: "Operación mayor", description: "Esterilización y otras cirugías programadas.", basePrice: 3500, durationMinutes: 120 },
    { name: "Estética / baño", description: "Baño, corte y cuidados de pelaje.", basePrice: 300, durationMinutes: 60 },
    { name: "Urgencia", description: "Atención fuera de lo programado.", basePrice: 800, durationMinutes: 45 },
  ];
  for (const svc of services) {
    const existing = await prisma.service.findFirst({ where: { name: svc.name } });
    if (!existing) await prisma.service.create({ data: svc });
  }

  /* ── Staff (admin, vets) ─────────────────────────── */
  const adminPass = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@patitasfelices.com" },
    update: {},
    create: {
      email: "admin@patitasfelices.com",
      phone: "0000000000",
      name: "Administrador",
      passwordHash: adminPass,
      role: "ADMIN",
    },
  });

  const vetPass = await bcrypt.hash("vet123", 10);
  async function ensureVet(opts: { email: string; phone: string; name: string; bio: string }) {
    const u = await prisma.user.upsert({
      where: { email: opts.email },
      update: {},
      create: {
        email: opts.email,
        phone: opts.phone,
        name: opts.name,
        passwordHash: vetPass,
        role: "VET",
      },
    });
    const v = await prisma.veterinarian.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, bio: opts.bio },
    });
    return { user: u, vet: v };
  }

  const maria = await ensureVet({
    email: "maria.lopez@patitasfelices.com",
    phone: "5551110001",
    name: "Dra. María López",
    bio: "Medicina general y cirugía de pequeñas especies. 10 años de experiencia.",
  });
  const juan = await ensureVet({
    email: "juan.ramirez@patitasfelices.com",
    phone: "5551110002",
    name: "Dr. Juan Ramírez",
    bio: "Especialista en exóticos y felinos.",
  });
  const julio = await ensureVet({
    email: "julio.mendoza@patitasfelices.com",
    phone: "5551110003",
    name: "Dr. Julio Mendoza",
    bio: "Medicina interna y dermatología veterinaria.",
  });

  /* ── Demo clients & pets ─────────────────────────── */
  const clientPass = await bcrypt.hash("cliente123", 10);
  const DEMO_CLIENTS: {
    email: string;
    phone: string;
    name: string;
    pets: { name: string; species: Species; breed?: string; weightKg?: number; sex?: "MALE" | "FEMALE"; sterilized?: boolean; ageMonths?: number; color?: string; notes?: string }[];
  }[] = [
    {
      email: "rosa@cliente.com",
      phone: "5559998888",
      name: "Doña Rosa",
      pets: [{ name: "Firulais", species: "DOG", breed: "Mestizo", weightKg: 12, sex: "MALE", ageMonths: 60, color: "café", sterilized: true }],
    },
    {
      email: "carlos.perez@cliente.com",
      phone: "5559990001",
      name: "Carlos Pérez",
      pets: [{ name: "Rocky", species: "DOG", breed: "Labrador", weightKg: 28, sex: "MALE", ageMonths: 72, color: "dorado", sterilized: false, notes: "Muy juguetón. Tiene displasia leve de cadera." }],
    },
    {
      email: "ana.lopez@cliente.com",
      phone: "5559990002",
      name: "Ana López",
      pets: [{ name: "Kiwi", species: "BIRD", breed: "Periquito australiano", weightKg: 0.04, sex: "MALE", ageMonths: 18, color: "verde y amarillo" }],
    },
    {
      email: "laura.sanchez@cliente.com",
      phone: "5559990003",
      name: "Laura Sánchez",
      pets: [{ name: "Mochi", species: "RABBIT", breed: "Enano holandés", weightKg: 1.8, sex: "FEMALE", ageMonths: 14, color: "blanco y negro", sterilized: true }],
    },
    {
      email: "roberto.torres@cliente.com",
      phone: "5559990004",
      name: "Roberto Torres",
      pets: [{ name: "Max", species: "DOG", breed: "Golden Retriever", weightKg: 32, sex: "MALE", ageMonths: 36, color: "dorado", sterilized: true, notes: "Dermatitis atópica controlada." }],
    },
    {
      email: "gabriela.ruiz@cliente.com",
      phone: "5559990005",
      name: "Gabriela Ruiz",
      pets: [
        { name: "Simba", species: "CAT", breed: "Persa", weightKg: 5.1, sex: "MALE", ageMonths: 84, color: "naranja", sterilized: true },
        { name: "Luna", species: "CAT", breed: "Siamés", weightKg: 4.2, sex: "FEMALE", ageMonths: 36, color: "crema", sterilized: true },
      ],
    },
    {
      email: "diego.flores@cliente.com",
      phone: "5559990006",
      name: "Diego Flores",
      pets: [{ name: "Nemo", species: "REPTILE", breed: "Gecko leopardo", weightKg: 0.09, sex: "MALE", ageMonths: 30, color: "amarillo con manchas" }],
    },
    {
      email: "sofia.herrera@cliente.com",
      phone: "5559990007",
      name: "Sofía Herrera",
      pets: [{ name: "Bella", species: "DOG", breed: "Poodle", weightKg: 7.5, sex: "FEMALE", ageMonths: 48, color: "blanco", sterilized: false }],
    },
  ];

  type CreatedClient = { userId: string; pets: { id: string; name: string; species: Species; ownerName: string }[] };
  const createdClients: CreatedClient[] = [];

  for (const c of DEMO_CLIENTS) {
    const u = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        phone: c.phone,
        name: c.name,
        passwordHash: clientPass,
        role: "CLIENT",
      },
    });
    const pets: CreatedClient["pets"] = [];
    for (const p of c.pets) {
      const existing = await prisma.pet.findFirst({ where: { ownerId: u.id, name: p.name } });
      const birthDate = p.ageMonths ? new Date(Date.now() - p.ageMonths * 30 * 24 * 3600 * 1000) : null;
      const pet =
        existing ??
        (await prisma.pet.create({
          data: {
            ownerId: u.id,
            name: p.name,
            species: p.species,
            breed: p.breed ?? null,
            weightKg: p.weightKg ?? null,
            sex: p.sex ?? "UNKNOWN",
            sterilized: p.sterilized ?? false,
            color: p.color ?? null,
            notes: p.notes ?? null,
            birthDate,
          },
        }));
      pets.push({ id: pet.id, name: pet.name, species: pet.species as Species, ownerName: c.name });
    }
    createdClients.push({ userId: u.id, pets });
  }

  /* ── Demo activity (only when DB is empty) ───────── */
  await seedDemoActivity({
    julioVetId: julio.vet.id,
    julioUserId: julio.user.id,
    mariaVetId: maria.vet.id,
    juanVetId: juan.vet.id,
    clients: createdClients,
  });

  console.log("\nSeed complete.\n");
  console.log("Credenciales demo (login con email):");
  console.log("  Admin   → admin@patitasfelices.com / admin123");
  console.log("  Vet 1   → maria.lopez@patitasfelices.com / vet123");
  console.log("  Vet 2   → juan.ramirez@patitasfelices.com / vet123");
  console.log("  Vet 3   → julio.mendoza@patitasfelices.com / vet123 ← cargado de citas");
  console.log("  Cliente → rosa@cliente.com / cliente123");
}

async function seedDemoActivity(args: {
  julioVetId: string;
  julioUserId: string;
  mariaVetId: string;
  juanVetId: string;
  clients: { userId: string; pets: { id: string; name: string; species: Species; ownerName: string }[] }[];
}) {
  const apptCount = await prisma.appointment.count();
  if (apptCount > 0) {
    console.log(`Skipping demo activity (${apptCount} appointments already exist).`);
    return;
  }

  const services = await prisma.service.findMany();
  const svc = (n: string) => services.find((s) => s.name === n)!;

  const SVC_CONSULTA = svc("Consulta general");
  const SVC_VACUNA = svc("Vacunación");
  const SVC_DESPARA = svc("Desparasitación");
  const SVC_OPMENOR = svc("Operación menor");
  const SVC_OPMAYOR = svc("Operación mayor");
  const SVC_ESTETICA = svc("Estética / baño");
  const SVC_URGENCIA = svc("Urgencia");

  const SERVICE_POOL: { service: typeof SVC_CONSULTA; weight: number }[] = [
    { service: SVC_CONSULTA, weight: 35 },
    { service: SVC_VACUNA, weight: 22 },
    { service: SVC_DESPARA, weight: 10 },
    { service: SVC_OPMENOR, weight: 8 },
    { service: SVC_OPMAYOR, weight: 4 },
    { service: SVC_ESTETICA, weight: 13 },
    { service: SVC_URGENCIA, weight: 8 },
  ];
  const totalWeight = SERVICE_POOL.reduce((acc, x) => acc + x.weight, 0);
  function pickService() {
    let r = Math.random() * totalWeight;
    for (const item of SERVICE_POOL) {
      r -= item.weight;
      if (r <= 0) return item.service;
    }
    return SVC_CONSULTA;
  }

  const NOTES_BY_SERVICE: Record<string, string[]> = {
    "Consulta general": [
      "Examen de rutina. Estado general bueno. Próxima visita en 6 meses.",
      "Sin anomalías detectadas. Continuar dieta y rutina actual.",
      "Peso ligeramente arriba del rango ideal, ajustar porciones.",
    ],
    "Vacunación": [
      "Vacuna pentavalente aplicada. Sin reacciones adversas.",
      "Antirrábica aplicada. Refuerzo en 12 meses.",
      "Vacuna múltiple aplicada correctamente. Vigilar zona de aplicación 24h.",
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
    "Urgencia": [
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

  const allPets = args.clients.flatMap((c) =>
    c.pets.map((p) => ({ ...p, ownerUserId: c.userId }))
  );

  // ── Build today: 7 for Julio, 3 for María, 2 for Juan ──
  const todayBase = startOfDay(new Date());
  const todayHours = [9, 10, 11, 12, 13, 14, 15, 16];
  const todaySlots: { hour: number; minute: number }[] = todayHours.map((h) => ({ hour: h, minute: pick([0, 30]) }));
  const shuffledPets = [...allPets].sort(() => Math.random() - 0.5);

  // Julio gets the morning + early afternoon (8 slots → 7 used)
  const todayApptsForJulio: typeof shuffledPets = shuffledPets.slice(0, 7);
  const todayApptsForMaria = shuffledPets.slice(7, 10);
  const todayApptsForJuan = shuffledPets.slice(10, 12);

  async function createAppointment(opts: {
    vetId: string;
    petId: string;
    clientId: string;
    serviceId: string;
    durationMinutes: number;
    priceEstimate: number;
    scheduledAt: Date;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    vetNotes?: string;
    instructions?: string;
    medications?: string;
    clientNotes?: string;
  }) {
    return prisma.appointment.create({ data: opts });
  }

  // Julio's today: first 2 COMPLETED, next 1 in-progress (SCHEDULED but past), rest SCHEDULED ahead
  for (let i = 0; i < todayApptsForJulio.length; i++) {
    const pet = todayApptsForJulio[i];
    const slot = todaySlots[i];
    const at = new Date(todayBase);
    at.setHours(slot.hour, slot.minute, 0, 0);
    const service = pickService();
    const isDone = i < 2;
    await createAppointment({
      vetId: args.julioVetId,
      petId: pet.id,
      clientId: pet.ownerUserId,
      serviceId: service.id,
      durationMinutes: service.durationMinutes,
      priceEstimate: service.basePrice,
      scheduledAt: at,
      status: isDone ? "COMPLETED" : "SCHEDULED",
      vetNotes: isDone ? notesFor(service.name) : undefined,
      instructions: isDone ? pick(INSTRUCTIONS_POOL) : undefined,
      medications: isDone ? pick(MEDS_POOL) : undefined,
    });
  }

  for (let i = 0; i < todayApptsForMaria.length; i++) {
    const pet = todayApptsForMaria[i];
    const at = new Date(todayBase);
    at.setHours(10 + i * 2, 0, 0, 0);
    const service = pickService();
    await createAppointment({
      vetId: args.mariaVetId,
      petId: pet.id,
      clientId: pet.ownerUserId,
      serviceId: service.id,
      durationMinutes: service.durationMinutes,
      priceEstimate: service.basePrice,
      scheduledAt: at,
      status: "SCHEDULED",
    });
  }

  for (let i = 0; i < todayApptsForJuan.length; i++) {
    const pet = todayApptsForJuan[i];
    const at = new Date(todayBase);
    at.setHours(11 + i * 3, 30, 0, 0);
    const service = pickService();
    await createAppointment({
      vetId: args.juanVetId,
      petId: pet.id,
      clientId: pet.ownerUserId,
      serviceId: service.id,
      durationMinutes: service.durationMinutes,
      priceEstimate: service.basePrice,
      scheduledAt: at,
      status: "SCHEDULED",
    });
  }

  // ── Future: next 14 days, ~10 for Julio + ~6 each others ──
  for (let day = 1; day <= 14; day++) {
    const date = new Date(todayBase);
    date.setDate(date.getDate() + day);
    const dow = date.getDay();
    if (dow === 0) continue; // clinic closed Sundays

    // 1-2 for Julio per day
    const julioToday = randInt(1, 2);
    for (let n = 0; n < julioToday; n++) {
      const pet = pick(allPets);
      const hour = pick([9, 10, 11, 13, 14, 15, 16]);
      const minute = pick([0, 30]);
      const at = new Date(date);
      at.setHours(hour, minute, 0, 0);
      const service = pickService();
      await createAppointment({
        vetId: args.julioVetId,
        petId: pet.id,
        clientId: pet.ownerUserId,
        serviceId: service.id,
        durationMinutes: service.durationMinutes,
        priceEstimate: service.basePrice,
        scheduledAt: at,
        status: "SCHEDULED",
      });
    }
    // 0-1 for María/Juan per day
    if (Math.random() < 0.5) {
      const pet = pick(allPets);
      const at = new Date(date);
      at.setHours(pick([10, 12, 14, 16]), pick([0, 30]), 0, 0);
      const service = pickService();
      await createAppointment({
        vetId: pick([args.mariaVetId, args.juanVetId]),
        petId: pet.id,
        clientId: pet.ownerUserId,
        serviceId: service.id,
        durationMinutes: service.durationMinutes,
        priceEstimate: service.basePrice,
        scheduledAt: at,
        status: "SCHEDULED",
      });
    }
  }

  // ── Past: last 180 days, lots for Julio (mostly COMPLETED) ──
  for (let day = 1; day <= 180; day++) {
    const date = new Date(todayBase);
    date.setDate(date.getDate() - day);
    const dow = date.getDay();
    if (dow === 0) continue;

    // ~30% chance Julio had a visit on a given past day
    if (Math.random() < 0.32) {
      const pet = pick(allPets);
      const at = new Date(date);
      at.setHours(pick([9, 10, 11, 13, 14, 15, 16]), pick([0, 30]), 0, 0);
      const service = pickService();
      const status: "COMPLETED" | "CANCELLED" | "NO_SHOW" =
        Math.random() < 0.88 ? "COMPLETED" : Math.random() < 0.5 ? "CANCELLED" : "NO_SHOW";
      await createAppointment({
        vetId: args.julioVetId,
        petId: pet.id,
        clientId: pet.ownerUserId,
        serviceId: service.id,
        durationMinutes: service.durationMinutes,
        priceEstimate: service.basePrice,
        scheduledAt: at,
        status,
        vetNotes: status === "COMPLETED" ? notesFor(service.name) : undefined,
        instructions: status === "COMPLETED" ? pick(INSTRUCTIONS_POOL) : undefined,
        medications: status === "COMPLETED" ? pick(MEDS_POOL) : undefined,
      });
    }
    // Less for the others
    if (Math.random() < 0.15) {
      const pet = pick(allPets);
      const at = new Date(date);
      at.setHours(pick([10, 12, 14, 16]), pick([0, 30]), 0, 0);
      const service = pickService();
      const status = Math.random() < 0.85 ? "COMPLETED" : "CANCELLED";
      await createAppointment({
        vetId: pick([args.mariaVetId, args.juanVetId]),
        petId: pet.id,
        clientId: pet.ownerUserId,
        serviceId: service.id,
        durationMinutes: service.durationMinutes,
        priceEstimate: service.basePrice,
        scheduledAt: at,
        status,
        vetNotes: status === "COMPLETED" ? notesFor(service.name) : undefined,
      });
    }
  }

  // ── Chat threads — generate messages on Julio's past completed appointments ──
  const julioCompleted = await prisma.appointment.findMany({
    where: { vetId: args.julioVetId, status: "COMPLETED" },
    include: { client: true, pet: true },
    orderBy: { scheduledAt: "desc" },
    take: 8,
  });

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

  let unreadCreated = 0;
  // First two threads: client messaged recently and vet hasn't replied (UNREAD)
  for (let i = 0; i < Math.min(2, julioCompleted.length); i++) {
    const a = julioCompleted[i];
    await prisma.message.create({
      data: {
        appointmentId: a.id,
        senderId: a.clientId,
        body: pick(CLIENT_QUESTIONS),
        createdAt: new Date(Date.now() - randInt(20, 90) * 60 * 1000),
        readAt: null,
      },
    });
    unreadCreated++;
  }

  // Older threads: full conversation, all read
  for (let i = 2; i < Math.min(8, julioCompleted.length); i++) {
    const a = julioCompleted[i];
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
        senderId: args.julioUserId,
        body: pick(VET_REPLIES),
        createdAt: new Date(baseTime.getTime() + 60 * 60 * 1000),
        readAt: new Date(baseTime.getTime() + 90 * 60 * 1000),
      },
    });
    // Sometimes the client says thanks
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

  // Plus a fresh unread on today's first SCHEDULED appt (so the bell badge pops)
  const todayScheduled = await prisma.appointment.findMany({
    where: { vetId: args.julioVetId, scheduledAt: { gte: todayBase }, status: "SCHEDULED" },
    take: 1,
    orderBy: { scheduledAt: "asc" },
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
    unreadCreated++;
  }

  console.log(`Demo activity: created appointments + ${unreadCreated} unread messages.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
