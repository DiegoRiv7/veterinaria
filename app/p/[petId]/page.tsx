import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { paletteFor, bgEmojisFor } from "@/lib/pet-flavor";
import {
  SPECIES_LABEL,
  SEX_LABEL,
  ageFromBirthDate,
} from "@/lib/utils";
import { NavChips, VisitsList } from "./cartilla-public-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cartilla pública · Vetsfriend",
  description: "Cartilla veterinaria digital",
  robots: { index: false, follow: false },
};

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

export default async function PublicCartillaPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: {
      owner: { select: { name: true, phone: true } },
      vaccines: { orderBy: { appliedAt: "desc" } },
      dewormings: { orderBy: { appliedAt: "desc" } },
      surgeries: { orderBy: { performedAt: "desc" } },
      appointments: {
        where: { status: "COMPLETED" },
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
    let status: "al día" | "próxima" | "vencida" = "al día";
    if (v.nextAt) {
      const days = Math.ceil((v.nextAt.getTime() - now) / 86400000);
      status = days > 60 ? "al día" : days >= 0 ? "próxima" : "vencida";
    }
    return { ...v, status };
  });

  // Auto + manual dewormings/surgeries combined
  const completed = pet.appointments;
  const apptDewormings = completed
    .filter((a) => isDeworming(a.service.name))
    .map((a) => ({
      id: `appt-${a.id}`,
      product: a.service.name,
      kind: null as string | null,
      appliedAt: a.scheduledAt,
      nextAt: null as Date | null,
      notes: a.medications || a.instructions || "Aplicada en consulta veterinaria.",
    }));
  const allDewormings = [...pet.dewormings, ...apptDewormings].sort(
    (a, b) => b.appliedAt.getTime() - a.appliedAt.getTime()
  );

  const apptSurgeries = completed
    .filter((a) => isSurgery(a.service.name))
    .map((a) => ({
      id: `appt-${a.id}`,
      name: a.service.name,
      performedAt: a.scheduledAt,
      clinic: "Vetsfriend" as string | null,
      notes: a.vetNotes || a.instructions || null,
    }));
  const allSurgeries = [...pet.surgeries, ...apptSurgeries].sort(
    (a, b) => b.performedAt.getTime() - a.performedAt.getTime()
  );

  const consults = completed.filter(
    (a) =>
      !isDeworming(a.service.name) &&
      !isSurgery(a.service.name) &&
      !/vacun/i.test(a.service.name)
  );

  const lastVet =
    pet.appointments.find((a) => a.vet?.user?.name)?.vet.user.name ?? null;

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{
        background:
          "linear-gradient(170deg, oklch(20% 0.04 40), oklch(13% 0.03 30))",
        color: "oklch(94% 0.02 60)",
      }}
    >
      {/* Brand strip */}
      <div className="px-5 pt-[max(20px,env(safe-area-inset-top))] pb-3 flex items-center gap-2.5">
        <Image
          src="/vetsfriend-icon-192.png"
          alt=""
          width={32}
          height={32}
          className="rounded-[8px]"
        />
        <p className="text-[15px] font-black" style={{ color: "oklch(94% 0.02 60)" }}>
          Vetsfriend
        </p>
        <span
          className="ml-auto text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{
            background: `${palette.accent}22`,
            color: palette.accent,
            border: `1px solid ${palette.accent}55`,
          }}
        >
          Cartilla pública
        </span>
      </div>

      <div className="px-4 pb-12 max-w-md mx-auto w-full flex flex-col gap-4">
        <NavChips accent={palette.accent} />
        {/* Hero */}
        <div
          className="rounded-[24px] p-5 flex items-center gap-4"
          style={{
            background:
              "linear-gradient(160deg, oklch(28% 0.06 35), oklch(22% 0.05 35))",
            border: "1px solid oklch(34% 0.05 35)",
            boxShadow: "0 16px 50px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="rounded-[20px] overflow-hidden flex items-center justify-center text-[40px] shrink-0"
            style={{
              width: 84,
              height: 84,
              background: pet.photoUrl
                ? "transparent"
                : `linear-gradient(145deg, ${palette.from}, ${palette.to})`,
              boxShadow: `0 6px 22px ${palette.accent}66`,
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
              bgEmojisFor(pet.species)[0]
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-extrabold tracking-[1.5px]"
              style={{ color: "oklch(58% 0.04 60)" }}
            >
              CARTILLA DE
            </p>
            <p className="text-[26px] font-black leading-tight tracking-tight">
              {pet.name}
            </p>
            <p
              className="text-[12px] font-bold"
              style={{ color: "oklch(78% 0.04 60)" }}
            >
              {pet.breed ?? SPECIES_LABEL[pet.species]} ·{" "}
              {SPECIES_LABEL[pet.species]}
            </p>
          </div>
        </div>

        {/* Datos */}
        <section id="datos">
          <DkCard>
            <SectionHeader icon="📇" label="Datos del paciente" />
            {[
              { l: "Fecha de nacimiento", v: formatLong(pet.birthDate) },
              { l: "Edad", v: age },
              { l: "Peso", v: pet.weightKg ? `${pet.weightKg} kg` : "—" },
              { l: "Género", v: SEX_LABEL[pet.sex] ?? "—" },
              { l: "Esterilizado/a", v: pet.sterilized ? "Sí" : "No" },
              { l: "Color", v: pet.color ?? "—" },
            ].map((row) => (
              <Row key={row.l} label={row.l} value={row.v} />
            ))}
          </DkCard>
        </section>

        {/* Owner + vet */}
        <section id="contacto">
          <DkCard>
            <SectionHeader icon="👤" label="Contacto" />
            <Row label="Propietario" value={pet.owner.name} />
            {pet.owner.phone && (
              <Row label="Teléfono" value={pet.owner.phone} />
            )}
            <Row label="Clínica" value="Vetsfriend · Clínica & Grooming" />
            {lastVet && <Row label="Veterinario" value={lastVet} />}
          </DkCard>
        </section>

        {/* Vacunas */}
        <section id="vacunas">
          <DkCard>
            <SectionHeader icon="💉" label="Vacunas" />
            {vaccines.length === 0 ? (
              <Empty text="Sin vacunas registradas." />
            ) : (
              vaccines.map((v) => (
                <div
                  key={v.id}
                  className="px-4 py-3 border-t"
                  style={{ borderTopColor: "oklch(34% 0.05 35)" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[14px] font-extrabold">{v.name}</p>
                    <StatusPill status={v.status} accent={palette.accent} />
                  </div>
                  <p
                    className="text-[12px] font-semibold"
                    style={{ color: "oklch(78% 0.04 60)" }}
                  >
                    Aplicada: {formatLong(v.appliedAt)}
                    {v.nextAt && (
                      <span
                        style={{ color: palette.accent, marginLeft: 8 }}
                      >
                        Próxima: {formatLong(v.nextAt)}
                      </span>
                    )}
                  </p>
                  {v.notes && (
                    <p
                      className="text-[12px] font-semibold mt-1"
                      style={{ color: "oklch(72% 0.04 60)" }}
                    >
                      {v.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </DkCard>
        </section>

        {/* Desparasitaciones */}
        <section id="desparas">
          <DkCard>
            <SectionHeader icon="💊" label="Desparasitaciones" />
            {allDewormings.length === 0 ? (
              <Empty text="Sin desparasitaciones registradas." />
            ) : (
              allDewormings.map((d) => (
                <div
                  key={d.id}
                  className="px-4 py-3 border-t"
                  style={{ borderTopColor: "oklch(34% 0.05 35)" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[14px] font-extrabold">{d.product}</p>
                    {d.kind && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                        style={{
                          background: `${palette.accent}22`,
                          color: palette.accent,
                          border: `1px solid ${palette.accent}55`,
                        }}
                      >
                        {d.kind}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[12px] font-semibold"
                    style={{ color: "oklch(78% 0.04 60)" }}
                  >
                    Aplicada: {formatLong(d.appliedAt)}
                    {d.nextAt && (
                      <span style={{ color: palette.accent, marginLeft: 8 }}>
                        Próxima: {formatLong(d.nextAt)}
                      </span>
                    )}
                  </p>
                  {d.notes && (
                    <p
                      className="text-[12px] font-semibold mt-1"
                      style={{ color: "oklch(72% 0.04 60)" }}
                    >
                      {d.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </DkCard>
        </section>

        {/* Cirugías */}
        <section id="cirugias">
          <DkCard>
            <SectionHeader icon="🔪" label="Procedimientos" />
            {allSurgeries.length === 0 ? (
              <Empty text="Sin procedimientos registrados." />
            ) : (
              allSurgeries.map((s) => (
                <div
                  key={s.id}
                  className="px-4 py-3 border-t"
                  style={{ borderTopColor: "oklch(34% 0.05 35)" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[14px] font-extrabold">{s.name}</p>
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: "oklch(78% 0.04 60)" }}
                    >
                      {formatLong(s.performedAt)}
                    </span>
                  </div>
                  {s.clinic && (
                    <p
                      className="text-[12px] font-semibold"
                      style={{ color: "oklch(72% 0.04 60)" }}
                    >
                      {s.clinic}
                    </p>
                  )}
                  {s.notes && (
                    <p
                      className="text-[12px] font-semibold mt-1"
                      style={{ color: "oklch(72% 0.04 60)" }}
                    >
                      {s.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </DkCard>
        </section>

        {/* Visitas — todas, expandibles */}
        <section id="visitas">
          <DkCard>
            <SectionHeader icon="📋" label={`Historial de visitas · ${consults.length}`} />
            <VisitsList
              accent={palette.accent}
              items={consults.map((c) => ({
                id: c.id,
                serviceName: c.service.name,
                date: formatLong(c.scheduledAt),
                vetName: c.vet.user.name,
                vetNotes: c.vetNotes,
                instructions: c.instructions,
                medications: c.medications,
              }))}
            />
          </DkCard>
        </section>

        <p
          className="text-center text-[11px] font-semibold py-4"
          style={{ color: "oklch(58% 0.04 60)" }}
        >
          Esta cartilla es de solo lectura. Para gestionar a {pet.name},
          accede con tu cuenta en Vetsfriend.
        </p>
      </div>
    </div>
  );
}

function DkCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{
        background: "oklch(24% 0.05 35)",
        border: "1px solid oklch(34% 0.05 35)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <span className="text-[18px]">{icon}</span>
      <p className="text-[14px] font-black">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-4 py-3 border-t"
      style={{ borderTopColor: "oklch(34% 0.05 35)" }}
    >
      <span
        className="text-[12px] font-bold"
        style={{ color: "oklch(72% 0.04 60)" }}
      >
        {label}
      </span>
      <span
        className="text-[13px] font-extrabold text-right"
        style={{
          color: "oklch(96% 0.02 60)",
          fontFamily: "var(--font-space-grotesk), sans-serif",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p
      className="text-[12px] font-semibold text-center py-4 px-4"
      style={{ color: "oklch(58% 0.04 60)" }}
    >
      {text}
    </p>
  );
}

function StatusPill({
  status,
  accent,
}: {
  status: "al día" | "próxima" | "vencida";
  accent: string;
}) {
  const map = {
    "al día": {
      bg: "oklch(35% 0.15 145 / 0.28)",
      border: "oklch(45% 0.16 145 / 0.5)",
      color: "oklch(76% 0.18 145)",
      label: "Al día ✓",
    },
    próxima: {
      bg: "oklch(35% 0.15 60 / 0.28)",
      border: "oklch(45% 0.16 60 / 0.5)",
      color: "oklch(76% 0.18 60)",
      label: "Próxima ⚠️",
    },
    vencida: {
      bg: "oklch(35% 0.15 25 / 0.28)",
      border: "oklch(45% 0.16 25 / 0.5)",
      color: "oklch(76% 0.18 25)",
      label: "Vencida",
    },
  } as const;
  const s = map[status];
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}
