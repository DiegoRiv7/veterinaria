import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Card, CardBody, List, ListItem } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const messagesRaw = await prisma.message.findMany({
    where: { appointmentId: appt.id },
    include: { sender: { select: { id: true, name: true, role: true, photoUrl: true } } },
    orderBy: { createdAt: "asc" },
  });
  const messages = messagesRaw.map((m) => ({
    ...m,
    vetPhotoUrl: appt.vet.photoUrl,
  }));

  return (
    <div className="flex flex-col gap-5 max-w-[860px] mx-auto w-full">
      <Link
        href="/vet/hoy"
        className="text-sm font-semibold no-underline"
        style={{ color: "var(--vet-green)" }}
      >
        ← Volver
      </Link>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1
            className="text-[24px] font-black tracking-tight"
            style={{ color: "var(--vet-text-1)" }}
          >
            {appt.service.name}
          </h1>
          <p className="text-[14px] font-semibold capitalize" style={{ color: "var(--vet-text-3)" }}>
            {formatDate(appt.scheduledAt)} · {formatTime(appt.scheduledAt)}
          </p>
        </div>
        <Badge
          variant={
            appt.status === "COMPLETED"
              ? "success"
              : appt.status === "CANCELLED"
                ? "danger"
                : "brand"
          }
        >
          {STATUS_LABEL[appt.status]}
        </Badge>
      </div>

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
        <form action={cancelAppointmentAction} className="mt-2">
          <input type="hidden" name="id" value={appt.id} />
          <button
            type="submit"
            className="w-full h-14 rounded-[16px] text-[15px] font-semibold border transition-colors hover:brightness-105"
            style={{
              background: "color-mix(in oklab, var(--vet-red) 10%, transparent)",
              borderColor: "color-mix(in oklab, var(--vet-red) 28%, transparent)",
              color: "var(--vet-red)",
            }}
          >
            Cancelar cita
          </button>
        </form>
      )}
    </div>
  );
}
