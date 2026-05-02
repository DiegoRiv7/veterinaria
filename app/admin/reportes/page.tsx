import { redirect } from "next/navigation";
import { Nunito, Space_Grotesk } from "next/font/google";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AdminReportsClient } from "@/components/admin/AdminReportsClient";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export default async function AdminReportsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const monthStart = startOfMonth();
  const monthEnd = addMonths(monthStart, 1);
  const last12Start = addMonths(monthStart, -11);

  const [appointments, vets] = await Promise.all([
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: last12Start, lt: monthEnd } },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        priceEstimate: true,
        pet: { select: { name: true, species: true } },
        service: { select: { name: true } },
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
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { appointments: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const data = appointments.map((a) => ({
    id: a.id,
    date: a.scheduledAt.toISOString(),
    status: a.status,
    priceEstimate: a.priceEstimate,
    petName: a.pet.name,
    petSpecies: a.pet.species,
    serviceName: a.service.name,
    vetId: a.vet.id,
    vetName: a.vet.user.name,
  }));

  const vetOptions = vets.map((v) => ({ id: v.id, name: v.user.name }));

  return (
    <div className={`${nunito.variable} ${spaceGrotesk.variable}`}>
      <AdminReportsClient
        appointments={data}
        vets={vetOptions}
        currentMonth={{ year: monthStart.getFullYear(), month: monthStart.getMonth() }}
      />
    </div>
  );
}
