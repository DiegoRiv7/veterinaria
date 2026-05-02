import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { HistorialViewClient } from "@/components/vet/HistorialViewClient";

export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export default async function VetRecordsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });
  const vetFilter = vetProfile ? { vetId: vetProfile.id } : {};

  // Last 12 months of completed records
  const last12Start = addMonths(startOfMonth(), -11);

  const records = await prisma.appointment.findMany({
    where: {
      ...vetFilter,
      status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
      scheduledAt: { gte: last12Start },
    },
    include: {
      pet: { select: { name: true, species: true } },
      service: { select: { name: true } },
      client: { select: { name: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Pre-compute visit counts per pet for the "más visitas" sort
  const visitCount = new Map<string, number>();
  for (const r of records) {
    if (r.status === "COMPLETED")
      visitCount.set(r.pet.name, (visitCount.get(r.pet.name) ?? 0) + 1);
  }

  const data = records.map((r) => ({
    id: r.id,
    date: r.scheduledAt.toISOString(),
    status: r.status,
    priceEstimate: r.priceEstimate,
    durationMinutes: r.durationMinutes,
    petName: r.pet.name,
    petSpecies: r.pet.species,
    clientName: r.client.name,
    serviceName: r.service.name,
    notes: r.vetNotes ?? r.instructions ?? r.medications ?? null,
    visitsForPet: visitCount.get(r.pet.name) ?? 0,
  }));

  return <HistorialViewClient records={data} />;
}
