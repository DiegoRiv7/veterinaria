import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AdminReportsClient } from "@/components/admin/AdminReportsClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const [appointments, vets, clients] = await Promise.all([
    prisma.appointment.findMany({
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        priceEstimate: true,
        pet: { select: { name: true, species: true } },
        service: { select: { name: true } },
        client: { select: { id: true, name: true } },
        vet: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
    }),
    prisma.veterinarian.findMany({
      select: {
        id: true,
        photoUrl: true,
        user: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminReportsClient
      adminName={session.name}
      appointments={appointments.map((a) => ({
        id: a.id,
        date: a.scheduledAt.toISOString(),
        status: a.status,
        priceEstimate: a.priceEstimate,
        petName: a.pet.name,
        petSpecies: a.pet.species,
        serviceName: a.service.name,
        vetId: a.vet.id,
        vetName: a.vet.user.name,
        clientId: a.client.id,
        clientName: a.client.name,
      }))}
      vets={vets.map((v) => ({
        id: v.id,
        name: v.user.name,
        photoUrl: v.photoUrl ?? null,
      }))}
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
