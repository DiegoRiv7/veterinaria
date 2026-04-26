import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clinic schedule — Mon to Sat 9:00 to 18:00, Sunday closed
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

  // Species price modifiers
  const species = [
    { species: "DOG" as const, multiplier: 1.0 },
    { species: "CAT" as const, multiplier: 1.0 },
    { species: "BIRD" as const, multiplier: 1.2 },
    { species: "RABBIT" as const, multiplier: 1.15 },
    { species: "HAMSTER" as const, multiplier: 1.1 },
    { species: "REPTILE" as const, multiplier: 1.3 },
    { species: "OTHER" as const, multiplier: 1.25 },
  ];
  for (const s of species) {
    await prisma.speciesPriceModifier.upsert({
      where: { species: s.species },
      update: { multiplier: s.multiplier },
      create: s,
    });
  }

  // Services
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

  // Admin
  const adminPass = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { phone: "0000000000" },
    update: {},
    create: {
      phone: "0000000000",
      name: "Administrador",
      passwordHash: adminPass,
      role: "ADMIN",
    },
  });

  // Two veterinarians
  const vetPass = await bcrypt.hash("vet123", 10);
  const vet1User = await prisma.user.upsert({
    where: { phone: "5551110001" },
    update: {},
    create: {
      phone: "5551110001",
      name: "Dra. María López",
      passwordHash: vetPass,
      role: "VET",
    },
  });
  await prisma.veterinarian.upsert({
    where: { userId: vet1User.id },
    update: {},
    create: {
      userId: vet1User.id,
      bio: "Medicina general y cirugía de pequeñas especies. 10 años de experiencia.",
    },
  });

  const vet2User = await prisma.user.upsert({
    where: { phone: "5551110002" },
    update: {},
    create: {
      phone: "5551110002",
      name: "Dr. Juan Ramírez",
      passwordHash: vetPass,
      role: "VET",
    },
  });
  await prisma.veterinarian.upsert({
    where: { userId: vet2User.id },
    update: {},
    create: {
      userId: vet2User.id,
      bio: "Especialista en exóticos y felinos.",
    },
  });

  // Demo client
  const clientPass = await bcrypt.hash("cliente123", 10);
  const demoClient = await prisma.user.upsert({
    where: { phone: "5559998888" },
    update: {},
    create: {
      phone: "5559998888",
      name: "Doña Rosa",
      passwordHash: clientPass,
      role: "CLIENT",
    },
  });

  const existingPet = await prisma.pet.findFirst({ where: { ownerId: demoClient.id, name: "Firulais" } });
  if (!existingPet) {
    await prisma.pet.create({
      data: {
        ownerId: demoClient.id,
        name: "Firulais",
        species: "DOG",
        breed: "Mestizo",
      },
    });
  }

  console.log("\nSeed complete.\n");
  console.log("Credenciales demo:");
  console.log("  Admin  → tel 0000000000 / admin123");
  console.log("  Vet 1  → tel 5551110001 / vet123");
  console.log("  Vet 2  → tel 5551110002 / vet123");
  console.log("  Cliente→ tel 5559998888 / cliente123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
