import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PatientsViewClient } from "@/components/vet/PatientsViewClient";

export const dynamic = "force-dynamic";

function ageFromBirthDate(birthDate: Date | null): string | null {
  if (!birthDate) return null;
  if (Number.isNaN(birthDate.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  if (now.getDate() < birthDate.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 1) return `${months}m`;
  if (months === 0) return `${years}a`;
  return `${years}a ${months}m`;
}

export default async function VetPatientsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });

  // Pets the vet has had appointments with (or all pets if admin/no profile)
  const pets = vetProfile
    ? await prisma.pet.findMany({
        where: {
          appointments: { some: { vetId: vetProfile.id } },
        },
        include: {
          owner: { select: { name: true } },
          appointments: {
            where: { vetId: vetProfile.id },
            orderBy: { scheduledAt: "desc" },
            select: { scheduledAt: true, status: true },
          },
        },
        orderBy: { name: "asc" },
      })
    : await prisma.pet.findMany({
        include: {
          owner: { select: { name: true } },
          appointments: {
            orderBy: { scheduledAt: "desc" },
            select: { scheduledAt: true, status: true },
          },
        },
        orderBy: { name: "asc" },
      });

  const formatVisit = (d: Date | undefined) => {
    if (!d) return "—";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    if (day.getTime() === today.getTime()) return "Hoy";
    return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(d);
  };

  const data = pets.map((p) => {
    const visitCount = p.appointments.filter(
      (a) => a.status === "COMPLETED"
    ).length;
    return {
      id: p.id,
      name: p.name,
      species: p.species,
      breed: p.breed ?? "Sin raza",
      age: ageFromBirthDate(p.birthDate) ?? "—",
      weight: p.weightKg ? `${p.weightKg}kg` : "—",
      owner: p.owner.name,
      lastVisit: formatVisit(p.appointments[0]?.scheduledAt),
      lastVisitAt: p.appointments[0]?.scheduledAt
        ? p.appointments[0].scheduledAt.toISOString()
        : null,
      visitCount,
    };
  });

  return <PatientsViewClient pets={data} />;
}
