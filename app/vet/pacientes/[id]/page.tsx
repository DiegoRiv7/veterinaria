import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppointmentRow } from "@/components/vet/AppointmentRow";
import { VetIcon } from "@/components/vet/VetIcon";
import { PetGallery } from "@/components/PetGallery";
import { PetFichaCard } from "@/components/vet/PetFichaCard";
import { BackLink } from "@/components/BackLink";
import {
  SPECIES_LABEL,
  SPECIES_EMOJI,
  SEX_LABEL,
  ageFromBirthDate,
  formatDate,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const SPECIES_TINT: Record<string, string> = {
  DOG: "#f4a460",
  CAT: "#b19cd9",
  BIRD: "#90ee90",
  RABBIT: "#d3d3d3",
  HAMSTER: "#ffd180",
  REPTILE: "#ffd700",
  OTHER: "#a0c4ff",
};

export default async function VetPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, phone: true, email: true } },
      photos: {
        select: { id: true, url: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!pet) notFound();

  // Appointments — vet sees only their own with this pet (admin sees all)
  const appts = await prisma.appointment.findMany({
    where: vetProfile ? { petId: id, vetId: vetProfile.id } : { petId: id },
    include: {
      service: true,
      client: { select: { name: true } },
      pet: { select: { name: true, species: true } },
      vet: { include: { user: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const upcoming = appts.filter(
    (a) => a.status === "SCHEDULED" && a.scheduledAt.getTime() >= Date.now()
  );
  const past = appts.filter((a) => !upcoming.includes(a));
  const completedCount = appts.filter((a) => a.status === "COMPLETED").length;

  const tint = SPECIES_TINT[pet.species] ?? "#a0c4ff";
  const age = ageFromBirthDate(pet.birthDate) ?? "—";

  return (
    <div className="flex flex-col gap-5 max-w-[1100px] mx-auto w-full">
      <BackLink
        fallbackHref="/vet/pacientes"
        className="text-sm font-semibold no-underline inline-flex items-center gap-1"
        style={{ color: "var(--vet-green)" }}
      >
        ← Volver
      </BackLink>

      {/* Pet header card */}
      <div
        className="border p-5 sm:p-6 flex flex-col sm:flex-row gap-5"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 22,
        }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-5xl border-2 flex-shrink-0 self-center sm:self-start"
          style={{ background: `${tint}33`, borderColor: `${tint}77` }}
        >
          {pet.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pet.photoUrl}
              alt={pet.name}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            SPECIES_EMOJI[pet.species] ?? "🐾"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1
            className="text-[26px] font-black tracking-tight"
            style={{ color: "var(--vet-text-1)" }}
          >
            {pet.name}
          </h1>
          <div className="text-[14px] font-semibold mt-0.5" style={{ color: "var(--vet-text-2)" }}>
            {SPECIES_LABEL[pet.species] ?? pet.species}
            {pet.breed ? ` · ${pet.breed}` : ""}
          </div>
          <div className="text-[12px] font-semibold mt-1" style={{ color: "var(--vet-text-3)" }}>
            👤 {pet.owner.name} · {pet.owner.phone}
            {pet.owner.email ? ` · ${pet.owner.email}` : ""}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {[
              { l: "Edad", v: age },
              { l: "Sexo", v: SEX_LABEL[pet.sex] ?? "—" },
              { l: "Peso", v: pet.weightKg ? `${pet.weightKg} kg` : "—" },
              { l: "Color", v: pet.color ?? "—" },
            ].map((item) => (
              <div
                key={item.l}
                className="rounded-lg py-2 px-3"
                style={{ background: "var(--vet-bg-mid)" }}
              >
                <div
                  className="text-[10px] font-extrabold uppercase tracking-wider"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {item.l}
                </div>
                <div
                  className="vet-mono text-[14px] font-bold mt-0.5"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  {item.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Citas totales", value: appts.length, color: "var(--vet-green)" },
          { label: "Completadas", value: completedCount, color: "var(--vet-blue)" },
          { label: "Próximas", value: upcoming.length, color: "var(--vet-amber)" },
          {
            label: "Esterilizado",
            value: pet.sterilized ? "Sí" : "No",
            color: "var(--vet-violet)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="border p-4"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              borderRadius: 18,
            }}
          >
            <div
              className="vet-mono text-[26px] font-bold leading-none"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
            <div className="text-[12px] font-bold mt-2" style={{ color: "var(--vet-text-2)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Ficha clínica del paciente — datos esenciales en tabla con CTA a
          la cartilla completa. */}
      <PetFichaCard
        pet={{
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          birthDate: pet.birthDate,
          weightKg: pet.weightKg,
          sex: pet.sex,
          color: pet.color,
          sterilized: pet.sterilized,
          microchipId: pet.microchipId,
        }}
        cartillaHref={`/vet/pacientes/${pet.id}/cartilla`}
      />

      {/* Photo gallery (read-only) — owner-uploaded photos */}
      {pet.photos.length > 0 && (
        <div
          className="border p-4 sm:p-5"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            borderRadius: 18,
          }}
        >
          <PetGallery
            petId={pet.id}
            petName={pet.name}
            initialPhotos={pet.photos}
            readonly
          />
        </div>
      )}

      {/* Notes if any */}
      {pet.notes && (
        <div
          className="border p-4 sm:p-5"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            borderRadius: 18,
          }}
        >
          <div
            className="text-[11px] font-extrabold uppercase tracking-wider mb-2"
            style={{ color: "var(--vet-text-3)" }}
          >
            Notas del dueño
          </div>
          <p
            className="text-[14px] leading-snug font-semibold whitespace-pre-line"
            style={{ color: "var(--vet-text-1)" }}
          >
            {pet.notes}
          </p>
        </div>
      )}

      {/* Upcoming appointments */}
      {upcoming.length > 0 && (
        <div
          className="border overflow-hidden"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            borderRadius: 22,
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center gap-2"
            style={{ borderBottomColor: "var(--vet-border)" }}
          >
            <VetIcon name="calendar" size={16} color="var(--vet-green)" />
            <span className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
              Próximas citas
            </span>
            <span
              className="ml-auto vet-mono text-[12px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "var(--vet-green-glow)", color: "var(--vet-green)" }}
            >
              {upcoming.length}
            </span>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {upcoming.map((a) => (
              <AppointmentRow key={a.id} appt={a} compact />
            ))}
          </div>
        </div>
      )}

      {/* Appointment history */}
      <div
        className="border overflow-hidden"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 22,
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderBottomColor: "var(--vet-border)" }}
        >
          <VetIcon name="records" size={16} color="var(--vet-text-2)" />
          <span className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
            Historial de visitas
          </span>
          <span
            className="ml-auto vet-mono text-[12px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "var(--vet-bg-mid)", color: "var(--vet-text-2)" }}
          >
            {past.length}
          </span>
        </div>
        {past.length === 0 ? (
          <div
            className="py-12 text-center"
            style={{ color: "var(--vet-text-3)" }}
          >
            <div className="text-[36px] mb-2">📋</div>
            <div className="text-[14px] font-bold" style={{ color: "var(--vet-text-2)" }}>
              Sin visitas anteriores
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--vet-border)" }}>
            {past.map((a) => {
              const hasNotes =
                a.vetNotes || a.instructions || a.medications;
              return (
                <Link
                  key={a.id}
                  href={`/vet/cita/${a.id}`}
                  className="block px-5 py-4 transition-colors no-underline hover:bg-[var(--vet-bg-hover)]"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-extrabold text-[14px]"
                        style={{ color: "var(--vet-text-1)" }}
                      >
                        {a.service.name}
                      </span>
                      <span
                        className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                        style={{
                          background:
                            a.status === "COMPLETED"
                              ? "oklch(52% 0.22 255 / 0.12)"
                              : a.status === "CANCELLED"
                                ? "oklch(52% 0.20 20 / 0.12)"
                                : "var(--vet-bg-mid)",
                          color:
                            a.status === "COMPLETED"
                              ? "oklch(40% 0.20 255)"
                              : a.status === "CANCELLED"
                                ? "oklch(40% 0.18 20)"
                                : "var(--vet-text-3)",
                        }}
                      >
                        {a.status === "COMPLETED"
                          ? "Completada"
                          : a.status === "CANCELLED"
                            ? "Cancelada"
                            : a.status === "NO_SHOW"
                              ? "No vino"
                              : "Agendada"}
                      </span>
                    </div>
                    <span
                      className="text-[12px] font-semibold capitalize"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      {formatDate(a.scheduledAt)}
                    </span>
                  </div>
                  {hasNotes ? (
                    <div className="text-[13px] font-semibold leading-snug line-clamp-2" style={{ color: "var(--vet-text-2)" }}>
                      {a.vetNotes ?? a.instructions ?? a.medications}
                    </div>
                  ) : (
                    <div className="text-[12px] font-semibold italic" style={{ color: "var(--vet-text-3)" }}>
                      Sin notas registradas
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
