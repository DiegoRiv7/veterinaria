import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { ClientsListClient } from "@/components/admin/ClientsListClient";

export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function ClientsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const monthStart = startOfMonth();

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
    const completed = c.appointments.filter((a) => a.status === "COMPLETED");
    const totalSpent = completed.reduce((acc, a) => acc + a.priceEstimate, 0);
    const lastVisit = c.appointments[0] ?? null;
    const monthAppts = c.appointments.filter(
      (a) => a.scheduledAt >= monthStart
    ).length;
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
      totalAppts: c.appointments.length,
      completedAppts: completed.length,
      monthAppts,
      totalSpent,
      lastVisit: lastVisit
        ? {
            date: lastVisit.scheduledAt.toISOString(),
            service: lastVisit.service.name,
            status: lastVisit.status,
          }
        : null,
    };
  });

  // Aggregates
  const totalSpent = rows.reduce((acc, r) => acc + r.totalSpent, 0);
  const topClient = [...rows].sort(
    (a, b) => b.completedAppts - a.completedAppts
  )[0];
  const topSpender = [...rows].sort((a, b) => b.totalSpent - a.totalSpent)[0];

  return (
    <ClientsListClient
      clients={rows}
      totals={{
        clients: rows.length,
        appointments: totalAppointments,
        revenue: totalSpent,
        topClient: topClient
          ? { name: topClient.name, count: topClient.completedAppts }
          : null,
        topSpender: topSpender
          ? { name: topSpender.name, amount: topSpender.totalSpent }
          : null,
      }}
    />
  );
}
