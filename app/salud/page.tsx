import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PageContainer } from "@/components/ui/page";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import {
  paletteFor,
  moodFor,
  bgEmojisFor,
} from "@/lib/pet-flavor";
import {
  SPECIES_LABEL,
  SEX_LABEL,
  ageFromBirthDate,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatLong(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function SaludPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const pets = await prisma.pet.findMany({
    where: { ownerId: session.userId },
    include: {
      vaccines: { orderBy: { appliedAt: "desc" } },
      appointments: {
        include: {
          service: { select: { name: true } },
          vet: { include: { user: { select: { name: true } } } },
        },
        orderBy: { scheduledAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (pets.length === 0) {
    return (
      <ClientShellServer>
        <PageContainer className="pb-12">
          <div
            className="rounded-[24px] py-14 px-6 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-[48px] mb-3">❤️</p>
            <p
              className="text-[16px] font-black mb-1"
              style={{ color: "var(--color-foreground)" }}
            >
              Aún no hay nada que cuidar
            </p>
            <p
              className="text-[13px] font-semibold mb-5"
              style={{ color: "var(--color-muted)" }}
            >
              Registra a tu mascota para empezar a llevar su salud al día.
            </p>
            <Link
              href="/mascotas/nueva"
              className="inline-block px-5 py-3 rounded-[12px] text-white text-[14px] font-extrabold"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 65%, oklch(45% 0.12 38)))",
              }}
            >
              + Registrar mi mascota
            </Link>
          </div>
        </PageContainer>
      </ClientShellServer>
    );
  }

  const cookieStore = await cookies();
  const activeIdCookie = cookieStore.get("activePetId")?.value ?? null;
  const active = pets.find((p) => p.id === activeIdCookie) ?? pets[0];
  const palette = paletteFor(active);
  const age = ageFromBirthDate(active.birthDate) ?? "—";

  // Vaccines with status
  const now = Date.now();
  const vaccinesView = active.vaccines.map((v) => {
    let status: "al día" | "próxima" | "vencida" | "—" = "—";
    let progress = 100;
    if (v.nextAt) {
      const days = Math.ceil((v.nextAt.getTime() - now) / 86400000);
      const span = (v.nextAt.getTime() - v.appliedAt.getTime()) / 86400000;
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
      status,
      progress,
    };
  });

  const ficha = [
    { l: "Fecha de nacimiento", v: formatLong(active.birthDate) },
    { l: "Especie", v: SPECIES_LABEL[active.species] ?? active.species },
    { l: "Raza", v: active.breed || "—" },
    { l: "Peso", v: active.weightKg ? `${active.weightKg} kg` : "—" },
    { l: "Género", v: SEX_LABEL[active.sex] ?? active.sex },
    { l: "Esterilizado/a", v: active.sterilized ? "Sí ✓" : "No" },
  ];

  const upcomingCount = active.appointments.filter(
    (a) =>
      a.status === "SCHEDULED" && a.scheduledAt.getTime() >= Date.now()
  ).length;
  const mood = moodFor({
    species: active.species,
    hasUpcoming: upcomingCount > 0,
    hasPendingVaccine: active.vaccines.some(
      (v) => v.nextAt && v.nextAt.getTime() < now
    ),
  });

  // Recent history — top 4 completed appointments for the historia card
  const HISTORY_ICON: Record<string, string> = {
    Vacunación: "💉",
    Desparasitación: "💊",
    "Operación menor": "🔪",
    "Operación mayor": "🔪",
    "Estética / baño": "🛁",
    Urgencia: "🚨",
    "Consulta general": "🩺",
  };
  function iconForService(name: string): string {
    if (HISTORY_ICON[name]) return HISTORY_ICON[name];
    if (/vacun/i.test(name)) return "💉";
    if (/desparasit|antiparasit/i.test(name)) return "💊";
    if (/operaci|cirug|esteriliza/i.test(name)) return "🔪";
    if (/urgenc|emergenc/i.test(name)) return "🚨";
    return "🩺";
  }
  const historyItems = active.appointments
    .filter((a) => a.status === "COMPLETED")
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      type: a.service.name,
      icon: iconForService(a.service.name),
      date: formatLong(a.scheduledAt),
      notes:
        a.vetNotes ||
        a.instructions ||
        a.medications ||
        a.clientNotes ||
        "Sin notas registradas.",
    }));

  return (
    <ClientShellServer>
      <PageContainer className="pb-12">
        <div className="flex flex-col gap-4 lg:gap-5">
          {/* Header — pet identity */}
          <section
            className="rounded-[20px] p-5 flex items-center gap-4"
            style={{
              background: `linear-gradient(180deg, ${palette.soft}, transparent)`,
            }}
          >
            <div
              className="rounded-full overflow-hidden flex items-center justify-center text-[34px] shrink-0"
              style={{
                width: 70,
                height: 70,
                background: active.photoUrl
                  ? "transparent"
                  : `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
                boxShadow: `0 6px 20px ${palette.accent}55`,
              }}
            >
              {active.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.photoUrl}
                  alt={active.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{bgEmojisFor(active.species)[0]}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1
                className="text-[26px] lg:text-[32px] font-black tracking-tight"
                style={{ color: "var(--color-foreground)" }}
              >
                {active.name}
              </h1>
              <p
                className="text-[13px] lg:text-[14px] font-semibold italic"
                style={{ color: "var(--color-muted)" }}
              >
                {mood}
              </p>
            </div>
          </section>

          {/* Ficha card */}
          <section
            className="rounded-[22px] overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderBottomColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[18px]">🪪</span>
                <span
                  className="text-[14px] font-black"
                  style={{ color: "var(--color-foreground)" }}
                >
                  Ficha de {active.name}
                </span>
              </div>
              <Link
                href="/salud/cartilla"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[12px] font-extrabold"
                style={{
                  background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
                  boxShadow: `0 3px 10px ${palette.accent}44`,
                }}
              >
                Ver más →
              </Link>
            </div>
            {ficha.map((row, i, arr) => (
              <div
                key={row.l}
                className="flex justify-between items-center px-5 py-3"
                style={{
                  borderBottom:
                    i < arr.length - 1
                      ? "1px solid color-mix(in oklab, var(--color-border) 55%, transparent)"
                      : "none",
                }}
              >
                <span
                  className="text-[13px] font-bold"
                  style={{ color: "var(--color-muted)" }}
                >
                  {row.l}
                </span>
                <span
                  className="text-[13px] font-extrabold"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {row.v}
                </span>
              </div>
            ))}
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-[13px] font-bold" style={{ color: "var(--color-muted)" }}>
                Edad
              </span>
              <span
                className="text-[13px] font-extrabold"
                style={{ color: "var(--color-foreground)" }}
              >
                {age}
              </span>
            </div>
          </section>

          {/* Vacunas / Protección */}
          <section
            className="rounded-[22px] overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3 border-b"
              style={{ borderBottomColor: "var(--color-border)" }}
            >
              <span className="text-[18px]">💉</span>
              <span
                className="text-[14px] font-black"
                style={{ color: "var(--color-foreground)" }}
              >
                Protección de {active.name}
              </span>
            </div>
            {vaccinesView.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p
                  className="text-[13px] font-bold mb-1"
                  style={{ color: "var(--color-foreground)" }}
                >
                  Aún no hay vacunas registradas
                </p>
                <Link
                  href={`/mascotas/${active.id}`}
                  className="inline-block mt-2 px-4 py-2 rounded-[12px] text-[12px] font-extrabold"
                  style={{
                    background: palette.soft,
                    color: palette.accent,
                    border: `1px solid ${palette.accent}33`,
                  }}
                >
                  Registrar primera vacuna →
                </Link>
              </div>
            ) : (
              vaccinesView.map((v, i, arr) => {
                const ok = v.status === "al día";
                const upcoming = v.status === "próxima";
                const overdue = v.status === "vencida";
                return (
                  <div
                    key={v.id}
                    className="px-5 py-3.5"
                    style={{
                      borderBottom:
                        i < arr.length - 1
                          ? "1px solid color-mix(in oklab, var(--color-border) 55%, transparent)"
                          : "none",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[14px] font-extrabold"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {v.name}
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-extrabold"
                        style={{
                          background: ok
                            ? "color-mix(in oklab, var(--vet-green, #2f7d4f) 14%, transparent)"
                            : upcoming
                            ? "color-mix(in oklab, var(--vet-amber, #d49247) 16%, transparent)"
                            : "color-mix(in oklab, #ef4444 14%, transparent)",
                          color: ok
                            ? "var(--vet-green, #2f7d4f)"
                            : upcoming
                            ? "var(--vet-amber, #b46e3e)"
                            : "#c0392b",
                        }}
                      >
                        {ok ? "¡Al día! 🎉" : upcoming ? "Próxima ⚠️" : "Vencida"}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden mb-2"
                      style={{
                        background:
                          "color-mix(in oklab, var(--color-border) 60%, var(--color-surface-2, var(--color-surface)))",
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${v.progress}%`,
                          background: overdue
                            ? "#ef4444"
                            : upcoming
                            ? "var(--vet-amber, #d49247)"
                            : palette.accent,
                        }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: "var(--color-muted)" }}
                      >
                        Aplicada: {v.applied}
                      </span>
                      <span
                        className="text-[11px] font-extrabold"
                        style={{
                          color: overdue
                            ? "#c0392b"
                            : upcoming
                            ? "var(--vet-amber, #b46e3e)"
                            : palette.accent,
                        }}
                      >
                        Próxima: {v.next}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* Historia clínica */}
          <section
            className="rounded-[22px] overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderBottomColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[18px]">📋</span>
                <span
                  className="text-[14px] font-black"
                  style={{ color: "var(--color-foreground)" }}
                >
                  Historia clínica de {active.name}
                </span>
              </div>
              <Link
                href="/citas"
                className="text-[12px] font-bold"
                style={{ color: palette.accent }}
              >
                Ver más →
              </Link>
            </div>
            {historyItems.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[36px] mb-2">📋</p>
                <p
                  className="text-[13px] font-bold mb-1"
                  style={{ color: "var(--color-foreground)" }}
                >
                  Sin historial clínico aún
                </p>
                <p
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--color-muted)" }}
                >
                  Las visitas completadas de {active.name} aparecerán aquí.
                </p>
              </div>
            ) : (
              historyItems.map((h, i, arr) => (
                <Link
                  key={h.id}
                  href={`/cita/${h.id}`}
                  className="flex items-start gap-3 px-5 py-3.5 hover:brightness-[1.02] transition"
                  style={{
                    borderBottom:
                      i < arr.length - 1
                        ? "1px solid color-mix(in oklab, var(--color-border) 55%, transparent)"
                        : "none",
                  }}
                >
                  <div
                    className="rounded-[12px] flex items-center justify-center text-[18px] shrink-0"
                    style={{
                      width: 38,
                      height: 38,
                      background: `${palette.accent}1a`,
                    }}
                  >
                    {h.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className="text-[13px] font-extrabold"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {h.type}
                      </span>
                      <span
                        className="text-[11px] font-semibold whitespace-nowrap"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {h.date}
                      </span>
                    </div>
                    <p
                      className="text-[12px] font-semibold leading-snug line-clamp-2"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {h.notes}
                    </p>
                  </div>
                  <span
                    className="self-center text-[14px] font-bold shrink-0"
                    style={{ color: palette.accent }}
                  >
                    →
                  </span>
                </Link>
              ))
            )}
          </section>
        </div>
      </PageContainer>
    </ClientShellServer>
  );
}

