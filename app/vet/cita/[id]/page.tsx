import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader } from "@/components/ui/page";
import { Card, CardBody, List, ListItem } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VetTabBar } from "@/components/VetTabBar";
import { DownloadRecetaButton } from "@/components/DownloadRecetaButton";
import { AppointmentNotesForm } from "@/components/AppointmentNotesForm";
import { AppointmentChat } from "@/components/AppointmentChat";
import { SPECIES_EMOJI, SPECIES_LABEL, STATUS_LABEL, formatDate, formatTime, formatCurrency } from "@/lib/utils";
import {
  updateAppointmentNotesAction,
  cancelAppointmentAction,
} from "@/app/actions/appointments";

export const dynamic = "force-dynamic";

export default async function VetAppointmentEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      pet: true,
      service: true,
      client: true,
      vet: { include: { user: true } },
    },
  });
  if (!appt) notFound();

  const messages = await prisma.message.findMany({
    where: { appointmentId: appt.id },
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell>
      <PageContainer>
        <Link href="/vet" className="text-sm text-[var(--color-brand)] mb-3 inline-block">
          ← Volver
        </Link>
        <PageHeader
          title={appt.service.name}
          subtitle={`${formatDate(appt.scheduledAt)} · ${formatTime(appt.scheduledAt)}`}
          right={
            <Badge variant={appt.status === "COMPLETED" ? "success" : appt.status === "CANCELLED" ? "danger" : "brand"}>
              {STATUS_LABEL[appt.status]}
            </Badge>
          }
        />

        <List>
          <ListItem>
            <div className="h-11 w-11 rounded-[14px] bg-[var(--color-brand-soft)] flex items-center justify-center text-2xl">
              {SPECIES_EMOJI[appt.pet.species]}
            </div>
            <div className="flex-1">
              <p className="font-medium">{appt.pet.name}</p>
              <p className="text-[13px] text-[var(--color-muted)]">
                {SPECIES_LABEL[appt.pet.species]}
                {appt.pet.breed ? ` · ${appt.pet.breed}` : ""}
              </p>
            </div>
          </ListItem>
          <ListItem>
            <div className="flex-1">
              <p className="text-[13px] text-[var(--color-muted)]">Cliente</p>
              <p className="font-medium">{appt.client.name}</p>
              <p className="text-[13px] text-[var(--color-muted)]">{appt.client.phone}</p>
            </div>
          </ListItem>
          <ListItem>
            <div className="flex-1">
              <p className="text-[13px] text-[var(--color-muted)]">Estimado</p>
              <p className="font-medium">{formatCurrency(appt.priceEstimate)}</p>
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

        <h3 className="text-[13px] uppercase tracking-wide text-[var(--color-muted)] px-1 mb-2 mt-6">
          Notas de la consulta
        </h3>
        <Card>
          <CardBody>
            <AppointmentNotesForm
              id={appt.id}
              defaultVetNotes={appt.vetNotes ?? ""}
              defaultInstructions={appt.instructions ?? ""}
              defaultMedications={appt.medications ?? ""}
              defaultCompleted={appt.status === "COMPLETED"}
              action={updateAppointmentNotesAction}
            />
          </CardBody>
        </Card>

        <div className="mt-6">
          <DownloadRecetaButton id={appt.id} />
        </div>

        <h3 className="text-[13px] uppercase tracking-wide text-[var(--color-muted)] px-1 mb-2 mt-6">
          Mensajes con el cliente
        </h3>
        <AppointmentChat
          messages={messages}
          currentUserId={session.userId}
          appointmentId={appt.id}
        />

        {appt.status === "SCHEDULED" && (
          <form action={cancelAppointmentAction} className="mt-6">
            <input type="hidden" name="id" value={appt.id} />
            <Button variant="danger" size="xl" className="w-full" type="submit">
              Cancelar cita
            </Button>
          </form>
        )}
      </PageContainer>
      <VetTabBar />
    </AppShell>
  );
}
