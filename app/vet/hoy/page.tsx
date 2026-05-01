import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { TodayViewClient } from "@/components/vet/TodayViewClient";

export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfNextDay(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

export default async function VetTodayPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });
  const vetFilter = vetProfile ? { vetId: vetProfile.id } : {};

  const appts = await prisma.appointment.findMany({
    where: { ...vetFilter, scheduledAt: { gte: startOfDay(), lt: startOfNextDay() } },
    include: { pet: true, service: true, client: true },
    orderBy: { scheduledAt: "asc" },
  });

  const headerDate = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  // Strip Date objects to plain strings for the client component
  const serializable = appts.map((a) => ({
    id: a.id,
    scheduledAt: a.scheduledAt.toISOString(),
    durationMinutes: a.durationMinutes,
    status: a.status,
    pet: { name: a.pet.name, species: a.pet.species },
    client: { name: a.client.name },
    service: { name: a.service.name },
  }));

  return (
    <TodayViewClient appts={serializable} headerDate={headerDate} />
  );
}
