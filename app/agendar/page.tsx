import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import { BookingWizard } from "./booking-wizard";

export const dynamic = "force-dynamic";

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");

  const { desde } = await searchParams;

  const [pets, services, modifiers, original] = await Promise.all([
    prisma.pet.findMany({ where: { ownerId: session.userId }, orderBy: { createdAt: "asc" } }),
    prisma.service.findMany({ where: { active: true }, orderBy: { basePrice: "asc" } }),
    prisma.speciesPriceModifier.findMany(),
    desde
      ? prisma.appointment.findUnique({
          where: { id: desde },
          select: {
            id: true,
            clientId: true,
            petId: true,
            serviceId: true,
            clientNotes: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const modifierMap = Object.fromEntries(modifiers.map((m) => [m.species, m.multiplier]));

  const prefill =
    original && original.clientId === session.userId
      ? {
          fromAppointmentId: original.id,
          petId: original.petId,
          serviceId: original.serviceId,
          clientNotes: original.clientNotes ?? "",
        }
      : null;

  return (
    <ClientShellServer>
      <PageContainer>
        <PageHeader
          title={prefill ? "Reagendar cita" : "Agendar cita"}
          subtitle={prefill ? "Elige un nuevo día y hora." : "Un paso a la vez."}
        />
        <BookingWizard
          pets={pets.map((p) => ({
            id: p.id,
            name: p.name,
            species: p.species,
            breed: p.breed,
            photoUrl: p.photoUrl,
          }))}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            basePrice: s.basePrice,
            durationMinutes: s.durationMinutes,
          }))}
          speciesMultipliers={modifierMap}
          prefill={prefill}
        />
      </PageContainer>
    </ClientShellServer>
  );
}
