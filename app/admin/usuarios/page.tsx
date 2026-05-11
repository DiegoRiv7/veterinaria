import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { UsersPageClient } from "@/components/admin/UsersPageClient";

export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function UsersPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const monthStart = startOfMonth();

  const [vets, receptionists, admins] = await Promise.all([
    prisma.veterinarian.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        _count: { select: { appointments: true } },
        appointments: {
          where: {
            status: "COMPLETED",
            scheduledAt: { gte: monthStart },
          },
          select: { priceEstimate: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "RECEPTIONIST" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        photoUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        photoUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <UsersPageClient
      currentAdminId={session.userId}
      vets={vets.map((v) => ({
        id: v.id,
        userId: v.user.id,
        name: v.user.name,
        email: v.user.email,
        phone: v.user.phone,
        photoUrl: v.photoUrl ?? null,
        totalAppts: v._count.appointments,
        monthCompleted: v.appointments.length,
        monthRevenue: v.appointments.reduce(
          (acc, a) => acc + a.priceEstimate,
          0
        ),
      }))}
      receptionists={receptionists.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        photoUrl: u.photoUrl ?? null,
        createdAt: u.createdAt.toISOString(),
      }))}
      admins={admins.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        photoUrl: u.photoUrl ?? null,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
