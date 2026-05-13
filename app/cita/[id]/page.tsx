import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader } from "@/components/ui/page";
import { Card, CardBody, List, ListItem } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import { BackLink } from "@/components/BackLink";
import { VetTabBar } from "@/components/VetTabBar";
import { AdminTabBar } from "@/components/AdminTabBar";
import { DownloadRecetaButton } from "@/components/DownloadRecetaButton";
import { AppointmentChat } from "@/components/AppointmentChat";
import { PetAvatar } from "@/components/PetAvatar";
import { VetAvatar } from "@/components/VetAvatar";
import { CancelAppointmentButton } from "@/components/CancelAppointmentButton";
import {
  SPECIES_LABEL,
  STATUS_LABEL,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/utils";
import { CalendarPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await readSession();
  if (!session) redirect("/login");

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      pet: true,
      service: true,
      vet: { include: { user: true } },
      client: true,
    },
  });
  if (!appt) notFound();

  const isClient = session.userId === appt.clientId;
  const isVet = session.role === "VET";
  const isAdmin = session.role === "ADMIN";
  if (!isClient && !isVet && !isAdmin) redirect("/inicio");

  // Mark messages addressed to this user as read
  await prisma.message.updateMany({
    where: {
      appointmentId: appt.id,
      readAt: null,
      senderId: { not: session.userId },
    },
    data: { readAt: new Date() },
  });

  const messagesRaw = await prisma.message.findMany({
    where: { appointmentId: appt.id },
    include: { sender: { select: { id: true, name: true, role: true, photoUrl: true } } },
    orderBy: { createdAt: "asc" },
  });
  const messages = messagesRaw.map((m) => ({
    ...m,
    vetPhotoUrl: appt.vet.photoUrl,
  }));

  const statusVariant =
    appt.status === "COMPLETED"
      ? "success"
      : appt.status === "CANCELLED" || appt.status === "NO_SHOW"
      ? "danger"
      : "brand";

  const isFuture = appt.scheduledAt.getTime() > Date.now();

  const Shell = isClient
    ? ({ children: c }: { children: React.ReactNode }) => (
        <ClientShellServer>{c}</ClientShellServer>
      )
    : ({ children: c }: { children: React.ReactNode }) => <AppShell>{c}</AppShell>;

  return (
    <Shell>
      <PageContainer>
        <BackLink fallbackHref={isClient ? "/inicio" : "/vet"} className="text-sm text-[var(--color-brand)] mb-3 inline-block">
          ← Volver
        </BackLink>
        <PageHeader
          title={appt.service.name}
          subtitle={`${appt.pet.name} · ${formatDate(appt.scheduledAt)} · ${formatTime(appt.scheduledAt)}`}
          right={<Badge variant={statusVariant}>{STATUS_LABEL[appt.status]}</Badge>}
        />

        <List>
          <ListItem>
            {(() => {
              const petHref =
                isClient
                  ? `/mascotas/${appt.pet.id}`
                  : `/vet/pacientes/${appt.pet.id}`;
              return (
                <Link
                  href={petHref}
                  className="flex items-center gap-3 -mx-3 -my-2 px-3 py-2 rounded-[10px] transition-colors hover:bg-[var(--color-surface-2,transparent)] no-underline flex-1"
                >
                  <PetAvatar
                    size="md"
                    photoUrl={appt.pet.photoUrl}
                    species={appt.pet.species}
                    name={appt.pet.name}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-bold inline-flex items-center gap-1.5"
                      style={{ color: "var(--color-brand)" }}
                    >
                      {appt.pet.name}
                      <span className="text-[12px]">→</span>
                    </p>
                    <p className="text-[13px] text-[var(--color-muted)]">
                      {SPECIES_LABEL[appt.pet.species]}
                      {appt.pet.breed ? ` · ${appt.pet.breed}` : ""}
                    </p>
                  </div>
                </Link>
              );
            })()}
          </ListItem>
          <ListItem>
            <VetAvatar
              size="md"
              photoUrl={appt.vet.photoUrl}
              name={appt.vet.user.name}
            />
            <div className="flex-1">
              <p className="text-[13px] text-[var(--color-muted)]">Veterinario</p>
              <p className="font-medium">{appt.vet.user.name}</p>
              {appt.vet.bio && (
                <p className="text-[12px] text-[var(--color-muted)] mt-0.5 line-clamp-1">
                  {appt.vet.bio}
                </p>
              )}
            </div>
          </ListItem>
          {(isVet || isAdmin) && (
            <ListItem>
              <div className="flex-1">
                <p className="text-[13px] text-[var(--color-muted)]">Cliente</p>
                <p className="font-medium">{appt.client.name}</p>
                <p className="text-[13px] text-[var(--color-muted)]">{appt.client.phone}</p>
              </div>
            </ListItem>
          )}
          <ListItem>
            <div className="flex-1">
              <p className="text-[13px] text-[var(--color-muted)]">Costo estimado</p>
              <p className="font-medium">{formatCurrency(appt.priceEstimate)}</p>
              <p className="text-[11px] text-[var(--color-muted)]">Se paga en el consultorio.</p>
            </div>
          </ListItem>
        </List>

        {appt.clientNotes && (
          <>
            <h3 className="text-[13px] uppercase tracking-wide text-[var(--color-muted)] px-1 mb-2 mt-6">
              Mensaje del cliente
            </h3>
            <Card>
              <CardBody>
                <p className="text-[15px] whitespace-pre-line">{appt.clientNotes}</p>
              </CardBody>
            </Card>
          </>
        )}

        {(appt.vetNotes || appt.instructions || appt.medications) && (
          <>
            <h3 className="text-[13px] uppercase tracking-wide text-[var(--color-muted)] px-1 mb-2 mt-6">
              Notas del veterinario
            </h3>
            <div className="flex flex-col gap-3">
              {appt.vetNotes && (
                <Card>
                  <CardBody>
                    <p className="text-[13px] text-[var(--color-muted)] uppercase tracking-wide mb-1">Diagnóstico</p>
                    <p className="text-[15px] whitespace-pre-line">{appt.vetNotes}</p>
                  </CardBody>
                </Card>
              )}
              {appt.instructions && (
                <Card>
                  <CardBody>
                    <p className="text-[13px] text-[var(--color-muted)] uppercase tracking-wide mb-1">Indicaciones</p>
                    <p className="text-[15px] whitespace-pre-line">{appt.instructions}</p>
                  </CardBody>
                </Card>
              )}
              {appt.medications && (
                <Card>
                  <CardBody>
                    <p className="text-[13px] text-[var(--color-muted)] uppercase tracking-wide mb-1">Medicamentos</p>
                    <p className="text-[15px] whitespace-pre-line">{appt.medications}</p>
                  </CardBody>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Receta médica — disponible cuando la consulta tiene notas */}
        {appt.status === "COMPLETED" &&
          (appt.vetNotes || appt.instructions || appt.medications) && (
            <div className="mt-6">
              <DownloadRecetaButton id={appt.id} />
            </div>
          )}

        <h3 className="text-[13px] uppercase tracking-wide text-[var(--color-muted)] px-1 mb-2 mt-6">
          Mensajes
        </h3>
        <AppointmentChat
          messages={messages}
          currentUserId={session.userId}
          appointmentId={appt.id}
        />

        {(isVet || isAdmin) && (
          <Link href={`/vet/cita/${appt.id}`} className="block mt-6">
            <Button size="xl" className="w-full">Editar notas de la cita</Button>
          </Link>
        )}

        {isClient && appt.status === "SCHEDULED" && isFuture && (
          <div className="mt-6 flex flex-col gap-3">
            <Link href={`/agendar?desde=${appt.id}`}>
              <Button size="xl" variant="secondary" className="w-full">
                <CalendarPlus className="h-4 w-4" />
                Reagendar cita
              </Button>
            </Link>
            <CancelAppointmentButton id={appt.id} redirectTo="/inicio" />
          </div>
        )}
      </PageContainer>
      {session.role === "VET" && <VetTabBar />}
      {session.role === "ADMIN" && <AdminTabBar />}
    </Shell>
  );
}
