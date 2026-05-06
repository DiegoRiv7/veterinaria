import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PageContainer } from "@/components/ui/page";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import { DeletePetButton } from "@/components/DeletePetButton";
import { PetDetailTabs } from "./pet-detail-tabs";
import {
  SPECIES_LABEL,
  SEX_LABEL,
  SPECIES_EMOJI,
  ageFromBirthDate,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const PET_RING_COLORS = [
  "#e8a061",
  "#b48cd9",
  "#a8d8a8",
  "#f0c95e",
  "#f4a472",
  "#9bb8d9",
];

function ringColorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PET_RING_COLORS[h % PET_RING_COLORS.length];
}

function formatLongDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await readSession();
  if (!session) redirect("/login");

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      appointments: {
        include: {
          service: true,
          vet: { include: { user: { select: { name: true, photoUrl: true } } } },
        },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });
  if (!pet) notFound();
  if (pet.ownerId !== session.userId) redirect("/mascotas");

  const ring = ringColorFor(pet.id);
  const age = ageFromBirthDate(pet.birthDate);

  // Vaccines: appointments whose service name includes "vacuna"
  const vaccineAppts = pet.appointments.filter((a) =>
    /vacun/i.test(a.service.name)
  );
  const now = Date.now();
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const vaccines = vaccineAppts
    .filter((a) => a.status === "COMPLETED")
    .map((a) => {
      const next = new Date(a.scheduledAt.getTime() + ONE_YEAR_MS);
      const daysToNext = Math.ceil((next.getTime() - now) / 86400000);
      const status: "al día" | "próxima" | "vencida" =
        daysToNext > 60 ? "al día" : daysToNext >= 0 ? "próxima" : "vencida";
      return {
        id: a.id,
        name: a.service.name,
        applied: formatLongDate(a.scheduledAt),
        next: formatLongDate(next),
        status,
      };
    })
    .slice(0, 8);

  const history = pet.appointments
    .filter((a) => a.status === "COMPLETED")
    .map((a) => ({
      id: a.id,
      type: a.service.name,
      date: formatLongDate(a.scheduledAt),
      vet: a.vet.user.name,
      vetPhotoUrl: a.vet.user.photoUrl,
      notes: a.vetNotes || a.instructions || a.medications || a.clientNotes || "Sin notas registradas.",
    }))
    .slice(0, 20);

  const info = [
    { label: "Fecha de nacimiento", value: formatLongDate(pet.birthDate) },
    { label: "Edad", value: age || "—" },
    { label: "Peso", value: pet.weightKg ? `${pet.weightKg} kg` : "—" },
    { label: "Género", value: SEX_LABEL[pet.sex] },
    { label: "Esterilizado/a", value: pet.sterilized ? "Sí ✓" : "No" },
    { label: "Color", value: pet.color || "—" },
    { label: "Microchip", value: pet.microchipId || "—" },
  ];

  return (
    <ClientShellServer>
      <PageContainer>
        <Link
          href="/mascotas"
          className="text-[14px] font-bold inline-block mb-4"
          style={{ color: "var(--color-brand)" }}
        >
          ← Volver
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="rounded-full flex items-center justify-center text-[36px] shrink-0"
            style={{
              width: 70,
              height: 70,
              background: `${ring}28`,
              border: `3px solid ${ring}55`,
            }}
          >
            {SPECIES_EMOJI[pet.species] || "🐾"}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[24px] font-black truncate"
              style={{ color: "var(--color-foreground)" }}
            >
              {pet.name}
            </p>
            <p
              className="text-[14px] font-semibold truncate"
              style={{ color: "var(--color-muted)" }}
            >
              {pet.breed || SPECIES_LABEL[pet.species]}
              {age ? ` · ${age}` : ""}
            </p>
          </div>
        </div>

        <PetDetailTabs info={info} vaccines={vaccines} history={history} />

        <div className="mt-7 flex flex-col gap-3">
          <Link
            href={`/mascotas/${pet.id}/editar`}
            className="block w-full py-3 rounded-[14px] text-center text-[14px] font-bold"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-foreground)",
            }}
          >
            ✏️ Editar información
          </Link>
          <DeletePetButton id={pet.id} name={pet.name} />
        </div>
      </PageContainer>
    </ClientShellServer>
  );
}
