import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { ClientsDashboard } from "@/components/admin/ClientsDashboard";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const [clients, totalAppointments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CLIENT" },
      include: {
        pets: {
          select: {
            id: true,
            name: true,
            species: true,
            photoUrl: true,
          },
        },
        appointments: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            priceEstimate: true,
            service: { select: { name: true } },
          },
          orderBy: { scheduledAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appointment.count(),
  ]);

  const rows = clients.map((c) => {
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      photoUrl: c.photoUrl ?? null,
      createdAt: c.createdAt.toISOString(),
      petCount: c.pets.length,
      pets: c.pets.map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        photoUrl: p.photoUrl ?? null,
      })),
      appointments: c.appointments.map((a) => ({
        id: a.id,
        status: a.status,
        scheduledAt: a.scheduledAt.toISOString(),
        priceEstimate: a.priceEstimate,
        serviceName: a.service.name,
      })),
    };
  });

  return (
    <ClientsDashboard
      clients={rows}
      totalAppointments={totalAppointments}
    />
  );
}
