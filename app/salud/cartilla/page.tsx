import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { paletteFor, bgEmojisFor } from "@/lib/pet-flavor";
import { SPECIES_LABEL, ageFromBirthDate } from "@/lib/utils";
import { CartillaTabs, type CartillaPayload } from "./cartilla-tabs";

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
      vaccines: { orderBy: { appliedAt: "desc" } },
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
    let progress = 100;
    if (v.nextAt) {
      const days = Math.ceil((v.nextAt.getTime() - now) / 86400000);
      const span =
        (v.nextAt.getTime() - v.appliedAt.getTime()) / 86400000;
      const elapsed = span - days;
      progress = Math.max(
        0,
        Math.min(100, Math.round((elapsed / Math.max(span, 1)) * 100))
      );
      status = days > 60 ? "al día" : days >= 0 ? "próxima" : "vencida";
    } else {
      status = "al día";
    }
    return {
      id: v.id,
      name: v.name,
      applied: formatLong(v.appliedAt),
      next: v.nextAt ? formatLong(v.nextAt) : "—",
      notes: v.notes ?? null,
      status,
      progress,
    };
  });

  const completedAppts = pet.appointments.filter(
    (a) => a.status === "COMPLETED"
  );

  const dewormings = completedAppts
    .filter((a) => isDeworming(a.service.name))
    .map((a) => ({
      id: a.id,
      name: a.service.name,
      date: formatLong(a.scheduledAt),
      vet: a.vet.user.name,
      notes:
        a.medications ||
        a.instructions ||
        a.vetNotes ||
        "Sin notas registradas.",
    }));

  const surgeries = completedAppts
    .filter((a) => isSurgery(a.service.name))
    .map((a) => ({
      id: a.id,
      name: a.service.name,
      date: formatLong(a.scheduledAt),
      vet: a.vet.user.name,
      notes:
        a.vetNotes ||
        a.instructions ||
        a.medications ||
        "Sin notas registradas.",
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
    dewormings,
    surgeries,
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
        <Link
          href="/salud"
          className="inline-flex items-center gap-1 text-[13px] font-bold mb-3"
          style={{ color: palette.accent }}
        >
          ← Volver a Salud
        </Link>
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
