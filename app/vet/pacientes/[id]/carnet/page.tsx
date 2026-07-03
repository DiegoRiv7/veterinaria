import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { BackLink } from "@/components/BackLink";
import {
  PassportCarnet,
  type CarnetDeworming,
  type CarnetVaccine,
} from "@/components/vet/PassportCarnet";
import {
  SPECIES_LABEL,
  SPECIES_EMOJI,
  SEX_LABEL,
  ageFromBirthDate,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VetPetCarnetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ abierto?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const { id } = await params;
  const { abierto } = await searchParams;
  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      vaccines: {
        include: { addedBy: { select: { name: true } } },
        orderBy: { appliedAt: "desc" },
      },
      dewormings: {
        include: { addedBy: { select: { name: true } } },
        orderBy: { appliedAt: "desc" },
      },
    },
  });
  if (!pet) notFound();

  const vaccines: CarnetVaccine[] = pet.vaccines.map((v) => ({
    id: v.id,
    name: v.name,
    appliedAt: v.appliedAt.toISOString(),
    nextAt: v.nextAt ? v.nextAt.toISOString() : null,
    weightKg: v.weightKg,
    notes: v.notes,
    vetName: v.addedBy.name,
  }));

  const dewormings: CarnetDeworming[] = pet.dewormings.map((d) => ({
    id: d.id,
    product: d.product,
    kind: d.kind,
    appliedAt: d.appliedAt.toISOString(),
    nextAt: d.nextAt ? d.nextAt.toISOString() : null,
    notes: d.notes,
    vetName: d.addedBy.name,
  }));

  return (
    <div className="flex flex-col gap-5 max-w-[900px] mx-auto w-full pb-8">
      <BackLink
        fallbackHref={`/vet/pacientes/${pet.id}`}
        className="inline-flex items-center gap-1 text-[13px] font-extrabold no-underline self-start"
        style={{ color: "var(--vet-green)" }}
      >
        <ChevronLeft size={14} /> Volver
      </BackLink>

      <PassportCarnet
        pet={{
          id: pet.id,
          name: pet.name,
          speciesLabel: SPECIES_LABEL[pet.species] ?? pet.species,
          emoji: SPECIES_EMOJI[pet.species] ?? "🐾",
          photoUrl: pet.photoUrl,
          breed: pet.breed,
          sexLabel: SEX_LABEL[pet.sex] ?? pet.sex,
          birth: pet.birthDate ? pet.birthDate.toISOString() : null,
          age: ageFromBirthDate(pet.birthDate) ?? "—",
          weightKg: pet.weightKg,
          microchipId: pet.microchipId,
          ownerName: pet.owner?.name ?? null,
        }}
        vaccines={vaccines}
        dewormings={dewormings}
        initialOpen={abierto === "1"}
      />
    </div>
  );
}
