import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientTabBar } from "@/components/ClientTabBar";
import { PetAvatar } from "@/components/PetAvatar";
import { EmptyState } from "@/components/EmptyState";
import { STATUS_LABEL, formatDate, formatTime, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PetAllAppointmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await readSession();
  if (!session) redirect("/login");

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      appointments: {
        include: { service: true, vet: { include: { user: true } } },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });
  if (!pet) notFound();
  if (pet.ownerId !== session.userId) redirect("/mascotas");

  return (
    <AppShell>
      <PageContainer>
        <Link
          href={`/mascotas/${pet.id}`}
          className="text-sm text-[var(--color-brand)] mb-3 inline-block"
        >
          ← {pet.name}
        </Link>

        <div className="flex items-center gap-3 mb-5">
          <PetAvatar size="md" photoUrl={pet.photoUrl} species={pet.species} name={pet.name} />
          <div className="min-w-0">
            <PageHeader
              title="Todas las citas"
              subtitle={`${pet.appointments.length} ${pet.appointments.length === 1 ? "cita" : "citas"} de ${pet.name}`}
            />
          </div>
        </div>

        {pet.appointments.length === 0 ? (
          <EmptyState
            emoji="📅"
            title="Sin citas todavía"
            description={`No hay citas registradas para ${pet.name}.`}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {pet.appointments.map((a) => (
              <Link key={a.id} href={`/cita/${a.id}`}>
                <Card className="hover:border-[var(--color-brand)]/30 hover:shadow-[var(--shadow-soft-md)] transition">
                  <CardBody className="flex items-center gap-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.service.name}</p>
                      <p className="text-[12px] text-[var(--color-muted)] truncate">
                        {formatDate(a.scheduledAt)} · {formatTime(a.scheduledAt)} · {a.vet.user.name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          a.status === "COMPLETED"
                            ? "success"
                            : a.status === "CANCELLED"
                            ? "danger"
                            : "brand"
                        }
                      >
                        {STATUS_LABEL[a.status]}
                      </Badge>
                      <span className="text-[12px] text-[var(--color-muted)]">
                        {formatCurrency(a.priceEstimate)}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
      <ClientTabBar />
    </AppShell>
  );
}
