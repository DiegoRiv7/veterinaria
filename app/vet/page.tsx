import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader, SectionTitle } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VetTabBar } from "@/components/VetTabBar";
import { EmptyState } from "@/components/EmptyState";
import { SPECIES_EMOJI, formatDate, formatTime, STATUS_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VetHome() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  // Find vet profile for this user (if admin has none, we show all vets)
  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where = vetProfile
    ? { vetId: vetProfile.id, scheduledAt: { gte: today, lt: tomorrow } }
    : { scheduledAt: { gte: today, lt: tomorrow } };

  const appts = await prisma.appointment.findMany({
    where,
    include: { pet: true, service: true, client: true, vet: { include: { user: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Hoy"
          subtitle={`${formatDate(today)} · ${appts.length} ${appts.length === 1 ? "cita" : "citas"}`}
        />

        {appts.length === 0 ? (
          <EmptyState
            emoji="☕"
            title="¡Día tranquilo!"
            description="No hay citas programadas para hoy. Aprovecha para descansar."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {appts.map((a) => (
              <Link key={a.id} href={`/vet/cita/${a.id}`}>
                <Card className="hover:shadow-[var(--shadow-ios-md)] transition">
                  <CardBody className="flex items-center gap-4">
                    <div className="flex flex-col items-center w-14">
                      <span className="text-[11px] text-[var(--color-muted)] uppercase">
                        {formatTime(a.scheduledAt).split(" ")[1]}
                      </span>
                      <span className="text-[20px] font-semibold leading-tight">
                        {formatTime(a.scheduledAt).split(" ")[0]}
                      </span>
                      <span className="text-[11px] text-[var(--color-muted)]">{a.durationMinutes}m</span>
                    </div>
                    <div className="h-11 w-11 rounded-[14px] bg-[var(--color-brand-soft)] flex items-center justify-center text-2xl">
                      {SPECIES_EMOJI[a.pet.species]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[16px] truncate">{a.service.name}</p>
                      <p className="text-[13px] text-[var(--color-muted)] truncate">
                        {a.pet.name} · {a.client.name}
                      </p>
                      {!vetProfile && (
                        <p className="text-[11px] text-[var(--color-muted)] truncate">
                          con {a.vet.user.name}
                        </p>
                      )}
                    </div>
                    <Badge variant={a.status === "COMPLETED" ? "success" : "brand"}>
                      {STATUS_LABEL[a.status]}
                    </Badge>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <SectionTitle>Resumen</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody>
              <p className="text-[13px] text-[var(--color-muted)]">Pendientes</p>
              <p className="text-[28px] font-semibold">
                {appts.filter((a) => a.status === "SCHEDULED").length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-[13px] text-[var(--color-muted)]">Completadas</p>
              <p className="text-[28px] font-semibold">
                {appts.filter((a) => a.status === "COMPLETED").length}
              </p>
            </CardBody>
          </Card>
        </div>
      </PageContainer>
      <VetTabBar />
    </AppShell>
  );
}
