import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { BackLink } from "@/components/BackLink";
import { PetAvatar } from "@/components/PetAvatar";
import { AppointmentChatWidget } from "@/components/vet/AppointmentChatWidget";
import { ConsultaForm } from "@/components/vet/ConsultaForm";
import { RescheduleDialog } from "@/components/vet/RescheduleDialog";
import { StatusBadge, statusToVariant } from "@/components/vet/StatusBadge";
import {
  SPECIES_LABEL,
  formatDate,
  formatTime,
  formatCurrency,
} from "@/lib/utils";
import { cancelAppointmentAction } from "@/app/actions/appointments";
import {
  DEFAULT_CONSULTA_SCHEMA,
  LEGACY_FIELD_IDS,
  parseConsultaData,
  parseFormSchema,
  type ConsultaData,
  type FormSchema,
} from "@/lib/form-schema";

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

  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const messagesRaw = await prisma.message.findMany({
    where: { appointmentId: appt.id },
    include: {
      sender: { select: { id: true, name: true, role: true, photoUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const messages = messagesRaw.map((m) => ({
    ...m,
    vetPhotoUrl: appt.vet.photoUrl,
  }));

  // Resolve the dynamic form schema for this service (or fall back to the
  // legacy "Consulta general" schema).
  const schema: FormSchema =
    parseFormSchema(appt.service.formSchema) ?? DEFAULT_CONSULTA_SCHEMA;

  // Resolve initial consulta values. If the new blob is empty but the
  // legacy columns have content, pre-populate the LEGACY_FIELD_IDS so the
  // vet sees their existing notes in the dynamic renderer.
  const parsed = parseConsultaData(appt.consultaData);
  const initial: ConsultaData = { ...parsed };
  const hasAnyParsed = Object.keys(parsed).length > 0;
  if (!hasAnyParsed) {
    if (appt.vetNotes) initial[LEGACY_FIELD_IDS.vetNotes] = appt.vetNotes;
    if (appt.instructions)
      initial[LEGACY_FIELD_IDS.instructions] = appt.instructions;
    if (appt.medications)
      initial[LEGACY_FIELD_IDS.medications] = appt.medications;
  }

  const isCancelled = appt.status === "CANCELLED";
  const isCompleted = appt.status === "COMPLETED";
  const isScheduled = appt.status === "SCHEDULED";

  return (
    <div className="w-full max-w-[1280px] mx-auto px-1">
      {/* Back link always at top */}
      <div className="mb-4">
        <BackLink
          fallbackHref="/vet/hoy"
          className="text-[13px] font-extrabold no-underline inline-flex items-center gap-1"
          style={{ color: "var(--vet-green)" }}
        >
          ← Volver
        </BackLink>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ─── Sidebar (desktop fixed, mobile stacked) ───────── */}
        <aside className="w-full lg:w-[320px] lg:shrink-0 lg:sticky lg:top-4 flex flex-col gap-4">
          {/* Pet card */}
          <div
            className="rounded-[16px] border p-5"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              boxShadow: "var(--shadow-soft-sm)",
            }}
          >
            <div className="flex items-center gap-3">
              <PetAvatar
                photoUrl={appt.pet.photoUrl}
                species={appt.pet.species}
                name={appt.pet.name}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[18px] font-black leading-tight truncate"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  {appt.pet.name}
                </p>
                <p
                  className="text-[12px] font-semibold truncate"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {SPECIES_LABEL[appt.pet.species]}
                  {appt.pet.breed ? ` · ${appt.pet.breed}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href={`/vet/pacientes/${appt.pet.id}`}
                className="h-10 rounded-[12px] border px-3 text-[11px] font-extrabold uppercase tracking-[0.06em] inline-flex items-center justify-center gap-1 no-underline transition hover:brightness-105"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-2)",
                }}
              >
                Ver expediente
                <span aria-hidden>→</span>
              </Link>
              <Link
                href={`/vet/pacientes/${appt.pet.id}/cartilla`}
                className="h-10 rounded-[12px] border px-3 text-[11px] font-extrabold uppercase tracking-[0.06em] inline-flex items-center justify-center gap-1 no-underline transition hover:brightness-105"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-2)",
                }}
              >
                Ver cartilla
                <span aria-hidden>→</span>
              </Link>
              <Link
                href={`/vet/pacientes/${appt.pet.id}/carnet`}
                className="col-span-2 h-10 rounded-[12px] border px-3 text-[11px] font-extrabold uppercase tracking-[0.06em] inline-flex items-center justify-center gap-1 no-underline transition hover:brightness-105"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-2)",
                }}
              >
                Ver carnet de vacunación
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {/* Client card */}
          <div
            className="rounded-[16px] border p-5"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              boxShadow: "var(--shadow-soft-sm)",
            }}
          >
            <p
              className="text-[11px] font-extrabold uppercase tracking-[0.08em] mb-1"
              style={{ color: "var(--vet-text-3)" }}
            >
              Cliente
            </p>
            <p
              className="text-[15px] font-extrabold truncate"
              style={{ color: "var(--vet-text-1)" }}
            >
              {appt.client.name}
            </p>
            <div className="flex flex-col gap-1.5 mt-2">
              {appt.client.phone && (
                <a
                  href={`tel:${appt.client.phone}`}
                  className="text-[13px] font-semibold no-underline truncate inline-flex items-center gap-1.5"
                  style={{ color: "var(--vet-green)" }}
                >
                  📞 {appt.client.phone}
                </a>
              )}
              {appt.client.email &&
                !appt.client.email.endsWith("@noemail.patitasfelices.com") && (
                  <a
                    href={`mailto:${appt.client.email}`}
                    className="text-[13px] font-semibold no-underline truncate inline-flex items-center gap-1.5"
                    style={{ color: "var(--vet-green)" }}
                  >
                    ✉️ {appt.client.email}
                  </a>
                )}
            </div>
            <AppointmentChatWidget
              messages={messages}
              currentUserId={session.userId}
              appointmentId={appt.id}
            />
          </div>

          {/* Meta card */}
          <div
            className="rounded-[16px] border p-5 flex flex-col gap-3"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              boxShadow: "var(--shadow-soft-sm)",
            }}
          >
            <MetaRow label="Estado">
              <StatusBadge variant={statusToVariant(appt.status)} />
            </MetaRow>
            <MetaRow label="Fecha">
              <span
                className="text-[13px] font-extrabold capitalize"
                style={{ color: "var(--vet-text-1)" }}
              >
                {formatDate(appt.scheduledAt)}
              </span>
            </MetaRow>
            <MetaRow label="Hora">
              <span
                className="text-[13px] font-extrabold"
                style={{ color: "var(--vet-text-1)" }}
              >
                {formatTime(appt.scheduledAt)}
              </span>
            </MetaRow>
            <MetaRow label="Duración">
              <span
                className="text-[13px] font-extrabold"
                style={{ color: "var(--vet-text-1)" }}
              >
                {appt.durationMinutes} min
              </span>
            </MetaRow>
            <MetaRow label="Estimado">
              <span
                className="text-[13px] font-extrabold"
                style={{ color: "var(--vet-text-1)" }}
              >
                {formatCurrency(appt.priceEstimate)}
              </span>
            </MetaRow>
          </div>

          {/* Client notes (if any) */}
          {appt.clientNotes && (
            <div
              className="rounded-[16px] border p-5"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                boxShadow: "var(--shadow-soft-sm)",
              }}
            >
              <p
                className="text-[11px] font-extrabold uppercase tracking-[0.08em] mb-2"
                style={{ color: "var(--vet-text-3)" }}
              >
                Mensaje del cliente
              </p>
              <p
                className="text-[13px] whitespace-pre-line leading-snug"
                style={{ color: "var(--vet-text-1)" }}
              >
                {appt.clientNotes}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 mt-1">
            {isScheduled && (
              <RescheduleDialog
                appointmentId={appt.id}
                scheduledAtIso={appt.scheduledAt.toISOString()}
                currentServiceId={appt.serviceId}
                services={services}
              />
            )}

            {!isCancelled && (
              <form action={cancelAppointmentAction}>
                <input type="hidden" name="id" value={appt.id} />
                <button
                  type="submit"
                  className="w-full h-12 px-4 rounded-[14px] text-[14px] font-extrabold border transition hover:brightness-105"
                  style={{
                    background:
                      "color-mix(in oklab, var(--vet-red) 10%, transparent)",
                    borderColor:
                      "color-mix(in oklab, var(--vet-red) 28%, transparent)",
                    color: "var(--vet-red)",
                  }}
                >
                  Cancelar cita
                </button>
              </form>
            )}
          </div>
        </aside>

        {/* ─── Main column ───────────────────────────────────── */}
        <main className="flex-1 min-w-0 w-full flex flex-col gap-6">
          {/* Cancelled notice */}
          {isCancelled && (
            <div
              className="rounded-[14px] border px-4 py-3 text-[13px] font-semibold"
              style={{
                background:
                  "color-mix(in oklab, var(--vet-red) 8%, transparent)",
                borderColor:
                  "color-mix(in oklab, var(--vet-red) 26%, transparent)",
                color: "var(--vet-red)",
              }}
            >
              Esta cita fue cancelada. El formulario es de sólo lectura.
            </div>
          )}

          {/* Dynamic consulta form */}
          <ConsultaForm
            schema={schema}
            initial={initial}
            appointmentId={appt.id}
            disabled={isCancelled}
            completed={isCompleted}
          />
        </main>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className="text-[11px] font-extrabold uppercase tracking-[0.08em]"
        style={{ color: "var(--vet-text-3)" }}
      >
        {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}
