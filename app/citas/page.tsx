import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer } from "@/components/ui/page";
import { ClientTabBar } from "@/components/ClientTabBar";
import { getClientNotifications } from "@/lib/client-notifications";
import { ClientCitasView } from "./citas-view";

export const dynamic = "force-dynamic";

export default async function ClientCitasPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const [appts, notifs] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientId: session.userId },
      include: {
        pet: { select: { id: true, name: true, species: true } },
        service: { select: { name: true, durationMinutes: true } },
        vet: { include: { user: { select: { name: true } } } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 80,
    }),
    getClientNotifications(session.userId),
  ]);

  const now = Date.now();
  const proximas = appts
    .filter(
      (a) =>
        a.status === "SCHEDULED" &&
        a.scheduledAt.getTime() >= now
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .map((a) => ({
      id: a.id,
      petName: a.pet.name,
      species: a.pet.species,
      serviceName: a.service.name,
      vetName: a.vet.user.name,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
    }));

  const historial = appts
    .filter(
      (a) =>
        a.status !== "SCHEDULED" ||
        a.scheduledAt.getTime() < now
    )
    .map((a) => ({
      id: a.id,
      petName: a.pet.name,
      species: a.pet.species,
      serviceName: a.service.name,
      vetName: a.vet.user.name,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
    }));

  return (
    <AppShell>
      <PageContainer>
        <h1
          className="text-[26px] font-black tracking-tight mb-4"
          style={{ color: "var(--color-foreground)" }}
        >
          Mis citas
        </h1>

        <Link
          href="/agendar"
          className="block mb-4"
        >
          <div
            className="w-full rounded-[16px] py-4 px-4 flex items-center justify-center gap-2 font-extrabold text-[15px] hover:brightness-105 transition"
            style={{
              background: "color-mix(in oklab, var(--color-brand) 12%, transparent)",
              border: "1.5px dashed var(--color-brand)",
              color: "var(--color-brand)",
            }}
          >
            + Agendar nueva cita
          </div>
        </Link>

        <ClientCitasView proximas={proximas} historial={historial} />
      </PageContainer>
      <ClientTabBar unreadNotifs={notifs.unreadCount} />
    </AppShell>
  );
}
