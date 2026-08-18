import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { paletteFor } from "@/lib/pet-flavor";
import { BackLink } from "@/components/BackLink";
import {
  SPECIES_LABEL,
  SPECIES_EMOJI,
  ageFromBirthDate,
  formatDate,
} from "@/lib/utils";
import { VetCartillaTabs } from "./vet-cartilla-tabs";

export const dynamic = "force-dynamic";

function isDeworming(name: string) {
  return /desparasit|antiparasit/i.test(name);
}
function isSurgery(name: string) {
  return /operaci[óo]n|cirug[ií]a|esteriliza/i.test(name);
}
function isVaccinationAppt(name: string) {
  return /vacun/i.test(name);
}

export default async function VetPetCartillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const { id } = await params;

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      vaccines: {
        include: { addedBy: { select: { name: true } } },
        orderBy: { appliedAt: "desc" },
      },
      dewormings: {
        include: { addedBy: { select: { name: true } } },
        orderBy: { appliedAt: "desc" },
      },
      surgeries: {
        include: { addedBy: { select: { name: true } } },
        orderBy: { performedAt: "desc" },
      },
      appointments: {
        include: {
          service: { select: { name: true } },
          vet: { include: { user: { select: { name: true } } } },
        },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });
  if (!pet) notFound();

  const palette = paletteFor(pet);
  const age = ageFromBirthDate(pet.birthDate) ?? "—";
  const now = Date.now();

  const vaccines = pet.vaccines.map((v) => {
    let status: "al día" | "próxima" | "vencida" | "—" = "—";
    if (v.nextAt) {
      const days = Math.ceil((v.nextAt.getTime() - now) / 86400000);
      status = days > 60 ? "al día" : days >= 0 ? "próxima" : "vencida";
    } else {
      status = "al día";
    }
    return {
      id: v.id,
      name: v.name,
      appliedAt: v.appliedAt.toISOString(),
      nextAt: v.nextAt ? v.nextAt.toISOString() : null,
      notes: v.notes,
      addedByName: v.vetName ?? v.addedBy.name,
      status,
    };
  });

  const completedAppts = pet.appointments.filter(
    (a) => a.status === "COMPLETED"
  );

  const manualDewormings = pet.dewormings.map((d) => ({
    id: d.id,
    product: d.product,
    kind: d.kind,
    appliedAt: d.appliedAt.toISOString(),
    nextAt: d.nextAt ? d.nextAt.toISOString() : null,
    notes: d.notes,
    addedByName: d.vetName ?? d.addedBy.name,
  }));

  const manualSurgeries = pet.surgeries.map((s) => ({
    id: s.id,
    name: s.name,
    performedAt: s.performedAt.toISOString(),
    clinic: s.clinic,
    notes: s.notes,
    addedByName: s.addedBy.name,
  }));

  const autoDewormings = completedAppts
    .filter((a) => isDeworming(a.service.name))
    .map((a) => ({
      id: `appt-${a.id}`,
      product: a.service.name,
      kind: null,
      appliedAt: a.scheduledAt.toISOString(),
      nextAt: null,
      notes:
        a.medications ||
        a.instructions ||
        a.vetNotes ||
        "Aplicada en consulta veterinaria.",
      addedByName: a.vet.user.name,
    }));

  const autoSurgeries = completedAppts
    .filter((a) => isSurgery(a.service.name))
    .map((a) => ({
      id: `appt-${a.id}`,
      name: a.service.name,
      performedAt: a.scheduledAt.toISOString(),
      clinic: "Vetsfriend",
      notes:
        a.vetNotes ||
        a.instructions ||
        a.medications ||
        "Realizada en consulta veterinaria.",
      addedByName: a.vet.user.name,
    }));

  const consults = completedAppts
    .filter(
      (a) =>
        !isDeworming(a.service.name) &&
        !isSurgery(a.service.name) &&
        !isVaccinationAppt(a.service.name)
    )
    .map((a) => ({
      id: a.id,
      type: a.service.name,
      date: formatDate(a.scheduledAt),
      vet: a.vet.user.name,
      notes:
        a.vetNotes ||
        a.instructions ||
        a.medications ||
        a.clientNotes ||
        "Sin notas registradas.",
    }));

  return (
    <div className="flex flex-col gap-5 max-w-[1100px] mx-auto w-full">
      <BackLink
        fallbackHref={`/vet/pacientes/${pet.id}`}
        className="inline-flex items-center gap-1 text-[13px] font-extrabold no-underline self-start"
        style={{ color: "var(--vet-green)" }}
      >
        <ChevronLeft size={14} /> Volver
      </BackLink>

      {/* Pet header band */}
      <div
        className="relative overflow-hidden p-6"
        style={{
          background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
          borderRadius: 22,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-[16px] overflow-hidden flex items-center justify-center text-[28px] flex-shrink-0 border-2"
            style={{
              borderColor: "rgba(255,255,255,0.4)",
              background: pet.photoUrl
                ? "rgba(255,255,255,0.10)"
                : "rgba(255,255,255,0.18)",
            }}
          >
            {pet.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pet.photoUrl}
                alt={pet.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{SPECIES_EMOJI[pet.species] ?? "🐾"}</span>
            )}
          </div>
          <div className="min-w-0">
            <p
              className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-white/80"
            >
              Cartilla médica
            </p>
            <h1
              className="text-white text-[26px] font-black tracking-tight leading-tight"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
            >
              {pet.name}
            </h1>
            <p
              className="text-white/90 text-[13px] font-semibold mt-0.5"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.20)" }}
            >
              {SPECIES_LABEL[pet.species] ?? pet.species}
              {pet.breed ? ` · ${pet.breed}` : ""} · {age}
              {pet.owner ? ` · 👤 ${pet.owner.name}` : ""}
            </p>
          </div>
        </div>
      </div>

      <VetCartillaTabs
        petId={pet.id}
        accent={palette.accent}
        vaccines={vaccines}
        dewormings={[...manualDewormings, ...autoDewormings]}
        surgeries={[...manualSurgeries, ...autoSurgeries]}
        consults={consults}
      />
    </div>
  );
}
