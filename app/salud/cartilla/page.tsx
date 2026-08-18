import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { paletteFor, bgEmojisFor } from "@/lib/pet-flavor";
import { SPECIES_LABEL, ageFromBirthDate } from "@/lib/utils";
import { CartillaTabs, type CartillaPayload } from "./cartilla-tabs";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";

function formatLong(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function isDeworming(name: string) {
  return /desparasit|antiparasit/i.test(name);
}
function isSurgery(name: string) {
  return /operaci[óo]n|cirug[ií]a|esteriliza/i.test(name);
}
function isVaccinationAppt(name: string) {
  return /vacun/i.test(name);
}

export default async function CartillaPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const activeIdCookie = cookieStore.get("activePetId")?.value ?? null;

  const pet = await prisma.pet.findFirst({
    where: {
      ownerId: session.userId,
      ...(activeIdCookie ? { id: activeIdCookie } : {}),
    },
    include: {
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
          vet: { include: { user: { select: { name: true, photoUrl: true, email: true } } } },
        },
        orderBy: { scheduledAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!pet) {
    // No pets at all → bounce to /salud which has the proper empty state.
    redirect("/salud");
  }

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

  // Manual entries — what the owner / vet wrote in the cartilla itself.
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

  // Auto-derived entries from completed appointments — read-only, surfaced
  // alongside the manual ones so the user sees the full picture.
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
      date: formatLong(a.scheduledAt),
      vet: a.vet.user.name,
      notes:
        a.vetNotes ||
        a.instructions ||
        a.medications ||
        a.clientNotes ||
        "Sin notas registradas.",
    }));

  // "Mi Vet" — most recent vet that attended this pet
  const lastApptWithVet = pet.appointments.find((a) => a.vet);
  const myVet = lastApptWithVet
    ? {
        name: lastApptWithVet.vet.user.name,
        photoUrl: lastApptWithVet.vet.user.photoUrl ?? null,
        email: lastApptWithVet.vet.user.email,
        clinic: "Vetsfriend · Clínica & Grooming",
      }
    : null;

  const payload: CartillaPayload = {
    pet: {
      id: pet.id,
      name: pet.name,
      species: SPECIES_LABEL[pet.species] ?? pet.species,
      breed: pet.breed ?? SPECIES_LABEL[pet.species] ?? pet.species,
      age,
      photoUrl: pet.photoUrl,
      emoji: bgEmojisFor(pet.species)[0],
    },
    palette: {
      from: palette.from,
      to: palette.to,
      accent: palette.accent,
    },
    vaccines,
    dewormings: [...manualDewormings, ...autoDewormings],
    surgeries: [...manualSurgeries, ...autoSurgeries],
    consults,
    myVet,
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{
        background:
          "linear-gradient(170deg, oklch(20% 0.04 40), oklch(13% 0.03 30))",
        color: "oklch(94% 0.02 60)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3"
        style={{
          borderBottom: "1px solid oklch(28% 0.04 35)",
        }}
      >
        <BackLink
          fallbackHref="/salud"
          className="inline-flex items-center gap-1 text-[13px] font-bold mb-3"
          style={{ color: palette.accent }}
        >
          ← Volver
        </BackLink>
        <div className="flex items-center gap-3">
          <div
            className="rounded-[16px] overflow-hidden flex items-center justify-center text-[28px] shrink-0"
            style={{
              width: 56,
              height: 56,
              background: pet.photoUrl
                ? "transparent"
                : `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
              boxShadow: `0 4px 14px ${palette.accent}55`,
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
              <span>{bgEmojisFor(pet.species)[0]}</span>
            )}
          </div>
          <div className="min-w-0">
            <p
              className="text-[19px] font-black leading-tight"
              style={{ color: "oklch(96% 0.02 60)" }}
            >
              Cartilla de {pet.name}
            </p>
            <p
              className="text-[13px] font-semibold truncate"
              style={{ color: "oklch(72% 0.04 60)" }}
            >
              {pet.breed ?? SPECIES_LABEL[pet.species]} · {age}
            </p>
          </div>
        </div>
      </div>

      <CartillaTabs payload={payload} />
    </div>
  );
}
