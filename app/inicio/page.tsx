import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PageContainer } from "@/components/ui/page";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import {
  formatTime,
  SPECIES_EMOJI,
  SPECIES_LABEL,
  ageFromBirthDate,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  SCHEDULED: {
    label: "confirmada",
    bg: "color-mix(in oklab, var(--vet-green, #2f7d4f) 12%, transparent)",
    color: "var(--vet-green, #2f7d4f)",
    border: "color-mix(in oklab, var(--vet-green, #2f7d4f) 28%, transparent)",
  },
  COMPLETED: {
    label: "completada",
    bg: "color-mix(in oklab, var(--color-brand) 12%, transparent)",
    color: "var(--color-brand)",
    border: "color-mix(in oklab, var(--color-brand) 28%, transparent)",
  },
  CANCELLED: {
    label: "cancelada",
    bg: "color-mix(in oklab, #ef4444 12%, transparent)",
    color: "#c0392b",
    border: "color-mix(in oklab, #ef4444 28%, transparent)",
  },
};

function dateLabel(d: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, today)) return "Hoy";
  if (same(d, tomorrow)) return "Mañana";
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

const PET_RING_COLORS = [
  "#e8a061", // peach
  "#b48cd9", // soft lavender
  "#a8d8a8", // mint
  "#f0c95e", // mustard
  "#f4a472", // peach soft
  "#9bb8d9", // sky
];

export default async function ClientHome() {
  const session = await readSession();
  if (!session) redirect("/login");

  const [pets, upcoming] = await Promise.all([
    prisma.pet.findMany({
      where: { ownerId: session.userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        clientId: session.userId,
        status: "SCHEDULED",
        scheduledAt: { gte: new Date() },
      },
      include: {
        pet: true,
        service: true,
        vet: { include: { user: { select: { name: true, photoUrl: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 1,
    }),
  ]);

  const next = upcoming[0];
  const today = new Date();
  const dateText = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today);

  return (
    <ClientShellServer>
      <PageContainer className="pb-8">
        {/* Greeting */}
        <div className="mb-5 lg:mb-7">
          <p
            className="text-[13px] lg:text-[14px] font-bold capitalize"
            style={{ color: "var(--color-muted)" }}
          >
            {dateText}
          </p>
          <h1
            className="text-[26px] lg:text-[34px] font-black tracking-tight leading-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            Hola, {session.name.split(" ")[0]} 👋
          </h1>
        </div>

        {/* Hero CTA — Agendar Cita */}
        <Link
          href="/agendar"
          className="block mb-6 hover:brightness-105 active:scale-[.99] transition"
        >
          <div
            className="rounded-[22px] p-5 flex items-center gap-4"
            style={{
              background:
                "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 65%, oklch(38% 0.14 38)))",
              boxShadow:
                "0 14px 36px color-mix(in oklab, var(--color-brand) 35%, transparent)",
            }}
          >
            <div
              className="h-13 w-13 rounded-[16px] flex items-center justify-center text-[26px]"
              style={{ width: 52, height: 52, background: "rgba(255,255,255,0.22)" }}
            >
              📅
            </div>
            <div className="flex-1 min-w-0 text-white">
              <p className="text-[18px] font-black leading-tight">Agendar cita</p>
              <p className="text-[13px] font-semibold text-white/85">Rápido y fácil en pocos pasos</p>
            </div>
            <span className="text-white/80 text-[22px]">→</span>
          </div>
        </Link>

        {/* Próxima cita */}
        {next && (
          <section className="mb-7">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2
                className="text-[16px] font-black"
                style={{ color: "var(--color-foreground)" }}
              >
                Próxima cita
              </h2>
              <Link
                href="/citas"
                className="text-[13px] font-bold"
                style={{ color: "var(--color-brand)" }}
              >
                Ver todas
              </Link>
            </div>
            <Link href={`/cita/${next.id}`} className="block">
              <div
                className="rounded-[20px] p-5 lg:p-6 flex items-center gap-4 lg:gap-5"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklab, var(--vet-blue, #f4c95e) 22%, var(--color-surface)), var(--color-surface))",
                  border:
                    "1.5px solid color-mix(in oklab, var(--vet-blue, #f4c95e) 35%, var(--color-border))",
                  boxShadow: "0 8px 22px rgba(206, 90, 45, 0.06)",
                }}
              >
                {/* Pet photo — main visual */}
                <div
                  className="rounded-full overflow-hidden flex items-center justify-center text-[28px] shrink-0"
                  style={{
                    width: 64,
                    height: 64,
                    background: next.pet.photoUrl
                      ? "transparent"
                      : "color-mix(in oklab, var(--color-brand) 16%, transparent)",
                    border: "2.5px solid color-mix(in oklab, var(--color-brand) 35%, var(--color-border))",
                  }}
                >
                  {next.pet.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={next.pet.photoUrl}
                      alt={next.pet.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{SPECIES_EMOJI[next.pet.species] || "🐾"}</span>
                  )}
                </div>

                {/* Info column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap"
                      style={{
                        background: STATUS_BADGE.SCHEDULED.bg,
                        color: STATUS_BADGE.SCHEDULED.color,
                        border: `1px solid ${STATUS_BADGE.SCHEDULED.border}`,
                      }}
                    >
                      {STATUS_BADGE.SCHEDULED.label}
                    </span>
                    {/* Date pinned right — only on lg+ where there's room */}
                    <span
                      className="hidden lg:inline text-[15px] font-black whitespace-nowrap"
                      style={{
                        color: "var(--color-foreground)",
                        fontFamily: "var(--font-space-grotesk), sans-serif",
                      }}
                    >
                      {dateLabel(next.scheduledAt)} · {formatTime(next.scheduledAt)}
                    </span>
                  </div>
                  <p
                    className="text-[17px] lg:text-[19px] font-black leading-tight truncate"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {next.service.name}
                  </p>
                  <p
                    className="text-[13px] lg:text-[14px] font-semibold mt-1 truncate"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {next.pet.name} · {next.vet.user.name}
                  </p>
                  {/* Date on its own row on mobile */}
                  <div
                    className="lg:hidden mt-2.5 flex items-center gap-1.5 text-[13px] font-extrabold"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    <span style={{ color: "var(--color-muted)" }}>📅</span>
                    <span>{dateLabel(next.scheduledAt)}</span>
                    <span style={{ color: "var(--color-muted)" }}>·</span>
                    <span
                      style={{
                        color: "var(--color-brand)",
                        fontFamily: "var(--font-space-grotesk), sans-serif",
                      }}
                    >
                      {formatTime(next.scheduledAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        <div className="lg:grid lg:grid-cols-2 lg:gap-5">

        {/* Mis mascotas */}
        <section className="mb-7 lg:mb-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2
              className="text-[16px] font-black"
              style={{ color: "var(--color-foreground)" }}
            >
              Mis mascotas
            </h2>
            <Link
              href="/mascotas"
              className="text-[13px] font-bold"
              style={{ color: "var(--color-brand)" }}
            >
              Ver todas
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:mx-0">
            {pets.slice(0, 6).map((p, i) => {
              const ring = PET_RING_COLORS[i % PET_RING_COLORS.length];
              return (
                <Link
                  key={p.id}
                  href={`/mascotas/${p.id}`}
                  className="flex-shrink-0 w-[110px] lg:w-auto flex flex-col items-center gap-2 p-3 lg:p-4 rounded-[18px] hover:brightness-105 transition"
                  style={{
                    background: "var(--color-surface)",
                    border: "1.5px solid var(--color-border)",
                  }}
                >
                  <div
                    className="rounded-full overflow-hidden flex items-center justify-center text-[26px]"
                    style={{
                      width: 52,
                      height: 52,
                      background: p.photoUrl ? "transparent" : `${ring}28`,
                      border: `2px solid ${ring}55`,
                    }}
                  >
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{SPECIES_EMOJI[p.species] || "🐾"}</span>
                    )}
                  </div>
                  <p
                    className="text-[14px] font-extrabold truncate w-full text-center"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {p.name}
                  </p>
                  <p
                    className="text-[11px] font-semibold truncate w-full text-center"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {p.breed || SPECIES_LABEL[p.species]}
                  </p>
                </Link>
              );
            })}
            <Link
              href="/mascotas/nueva"
              className="flex-shrink-0 w-[100px] lg:w-auto flex flex-col items-center justify-center gap-2 rounded-[18px] py-4 lg:py-6"
              style={{
                background: "transparent",
                border: "1.5px dashed var(--color-border)",
                color: "var(--color-muted)",
              }}
            >
              <div
                className="rounded-full flex items-center justify-center text-[24px]"
                style={{
                  width: 50,
                  height: 50,
                  background: "var(--color-surface-2, var(--color-surface))",
                }}
              >
                +
              </div>
              <span className="text-[12px] font-bold">Agregar</span>
            </Link>
          </div>
        </section>

        {/* Tip / Consejo del mes */}
        <section className="mb-2 lg:mb-0">
          <div
            className="rounded-[20px] p-5 flex items-start gap-3 lg:h-full"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--vet-blue, #f4c95e) 16%, var(--color-surface)), var(--color-surface))",
              border: "1.5px solid color-mix(in oklab, var(--vet-blue, #f4c95e) 28%, var(--color-border))",
            }}
          >
            <span className="text-[28px]">🌿</span>
            <div className="min-w-0">
              <p
                className="text-[14px] font-black mb-1"
                style={{ color: "var(--color-foreground)" }}
              >
                Consejo del mes
              </p>
              <p
                className="text-[13px] font-semibold leading-snug"
                style={{ color: "var(--color-muted)" }}
              >
                Mayo es temporada de pulgas y garrapatas. Recuerda aplicar la
                pipeta antiparasitaria a tus peluditos.
              </p>
            </div>
          </div>
        </section>

        </div>
      </PageContainer>
    </ClientShellServer>
  );
}
