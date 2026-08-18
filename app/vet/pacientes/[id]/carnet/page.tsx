import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { BackLink } from "@/components/BackLink";
import { PetAvatar } from "@/components/PetAvatar";
import {
  PassportCarnet,
  type CarnetDeworming,
  type CarnetVaccine,
} from "@/components/vet/PassportCarnet";
import { SPECIES_LABEL, ageFromBirthDate } from "@/lib/utils";

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
  const vets = await prisma.veterinarian.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const vetNameOptions = vets.map((v) => v.user.name);
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

  const age = ageFromBirthDate(pet.birthDate) ?? "—";

  const vaccines: CarnetVaccine[] = pet.vaccines.map((v) => ({
    id: v.id,
    name: v.name,
    appliedAt: v.appliedAt.toISOString(),
    nextAt: v.nextAt ? v.nextAt.toISOString() : null,
    weightKg: v.weightKg,
    notes: v.notes,
    vetName: v.vetName ?? v.addedBy.name,
  }));

  const dewormings: CarnetDeworming[] = pet.dewormings.map((d) => ({
    id: d.id,
    product: d.product,
    kind: d.kind,
    appliedAt: d.appliedAt.toISOString(),
    nextAt: d.nextAt ? d.nextAt.toISOString() : null,
    notes: d.notes,
    vetName: d.vetName ?? d.addedBy.name,
  }));

  return (
    <div className="flex flex-col gap-5 max-w-[1150px] mx-auto w-full pb-10">
      <BackLink
        fallbackHref={`/vet/pacientes/${pet.id}`}
        className="inline-flex items-center gap-1 text-[13px] font-extrabold no-underline self-start"
        style={{ color: "var(--vet-green)" }}
      >
        <ChevronLeft size={14} /> Volver
      </BackLink>

      {/* Identidad de la mascota */}
      <div
        className="rounded-[16px] border p-4 flex items-center gap-3"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          boxShadow: "var(--shadow-soft-sm)",
        }}
      >
        <PetAvatar
          photoUrl={pet.photoUrl}
          species={pet.species}
          name={pet.name}
          size="lg"
        />
        <div className="min-w-0">
          <p
            className="text-[11px] font-extrabold uppercase tracking-[0.08em]"
            style={{ color: "var(--vet-text-3)" }}
          >
            Pasaporte de vacunación
          </p>
          <p
            className="text-[18px] font-black leading-tight truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            {pet.name}
          </p>
          <p
            className="text-[12px] font-semibold truncate"
            style={{ color: "var(--vet-text-3)" }}
          >
            {SPECIES_LABEL[pet.species]}
            {pet.breed ? ` · ${pet.breed}` : ""} · {age}
            {pet.owner ? ` · 👤 ${pet.owner.name}` : ""}
          </p>
        </div>
      </div>

      <PassportCarnet
        petId={pet.id}
        petName={pet.name}
        vaccines={vaccines}
        dewormings={dewormings}
        initialOpen={abierto === "1"}
        defaultVetName={session.name}
        vetNameOptions={vetNameOptions}
      />
    </div>
  );
}
