import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ClientTabBar } from "@/components/ClientTabBar";
import { PetForm } from "@/components/PetForm";
import { updatePetAction } from "@/app/actions/appointments";

export const dynamic = "force-dynamic";

export default async function EditPetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await readSession();
  if (!session) redirect("/login");

  const pet = await prisma.pet.findUnique({ where: { id } });
  if (!pet) notFound();
  if (pet.ownerId !== session.userId) redirect("/mascotas");

  return (
    <AppShell>
      <PageContainer>
        <Link
          href={`/mascotas/${pet.id}`}
          className="text-sm text-[var(--color-brand)] mb-3 inline-block"
        >
          ← Volver
        </Link>
        <PageHeader title="Editar información" subtitle={`Cambia los datos de ${pet.name}.`} />
        <Card>
          <CardBody>
            <PetForm
              action={updatePetAction}
              submitLabel="Guardar cambios"
              redirectTo={`/mascotas/${pet.id}`}
              initial={{
                id: pet.id,
                name: pet.name,
                species: pet.species,
                breed: pet.breed,
                birthDate: pet.birthDate,
                sex: pet.sex,
                weightKg: pet.weightKg,
                color: pet.color,
                microchipId: pet.microchipId,
                sterilized: pet.sterilized,
                notes: pet.notes,
                photoUrl: pet.photoUrl,
              }}
            />
          </CardBody>
        </Card>
      </PageContainer>
      <ClientTabBar />
    </AppShell>
  );
}
