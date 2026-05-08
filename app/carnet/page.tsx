import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import {
  paletteFor,
  bgEmojisFor,
} from "@/lib/pet-flavor";
import {
  SPECIES_LABEL,
  SEX_LABEL,
  ageFromBirthDate,
} from "@/lib/utils";
import { CarnetQrCode } from "@/components/CarnetQrCode";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function formatLong(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function CarnetPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const pets = await prisma.pet.findMany({
    where: { ownerId: session.userId },
    include: {
      vaccines: { take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  if (pets.length === 0) {
    return (
      <ClientShellServer>
        <div
          className="flex-1 flex items-center justify-center px-5"
          style={{ background: "oklch(18% 0.06 268)" }}
        >
          <div className="text-center max-w-sm">
            <p className="text-[64px] mb-3">🪪</p>
            <p className="text-white text-[18px] font-black mb-2">
              Sin carnet aún
            </p>
            <p
              className="text-[14px] font-semibold mb-6"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Registra a tu mascota y aquí va a vivir su credencial digital con
              su QR para mostrar a cualquier vet.
            </p>
            <Link
              href="/mascotas/nueva"
              className="inline-block px-5 py-3 rounded-[14px] text-[14px] font-extrabold"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 65%, oklch(45% 0.12 38)))",
                color: "white",
              }}
            >
              + Registrar mi mascota
            </Link>
          </div>
        </div>
      </ClientShellServer>
    );
  }

  const cookieStore = await cookies();
  const activeIdCookie = cookieStore.get("activePetId")?.value ?? null;
  const active = pets.find((p) => p.id === activeIdCookie) ?? pets[0];
  const palette = paletteFor(active);
  const age = ageFromBirthDate(active.birthDate) ?? "—";
  const owner = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, phone: true },
  });

  // Compute absolute URL for the public cartilla page so the QR works
  // when the carnet is shown / printed off-device.
  const headersList = await headers();
  const host = headersList.get("host") ?? "veterinaria10.vercel.app";
  const proto =
    headersList.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const publicUrl = `${proto}://${host}/p/${active.id}`;

  // Dark palette tinted by pet's accent hue
  const dk = {
    bg: "oklch(18% 0.07 268)",
    bg2: "oklch(23% 0.08 268)",
    card: "oklch(26% 0.07 268)",
    border: "oklch(36% 0.07 268)",
    accent: palette.accent,
    text: "oklch(94% 0.02 240)",
    textDim: "oklch(72% 0.04 240)",
    textMuted: "oklch(52% 0.04 240)",
  };

  const fields: { l: string; v: string }[] = [
    { l: "FECHA NAC.", v: formatLong(active.birthDate) },
    { l: "GÉNERO", v: SEX_LABEL[active.sex] ?? "—" },
    { l: "PESO", v: active.weightKg ? `${active.weightKg} kg` : "—" },
    {
      l: "ESTERILIZADO",
      v: active.sterilized ? "Sí" : "No",
    },
    { l: "EDAD", v: age },
    { l: "ESPECIE", v: SPECIES_LABEL[active.species] ?? active.species },
  ];

  return (
    <ClientShellServer>
      <div
        className="min-h-full p-4 lg:p-8"
        style={{
          background: `linear-gradient(160deg, ${dk.bg2}, ${dk.bg})`,
        }}
      >
        <div className="max-w-[460px] mx-auto flex flex-col gap-4">
          {/* The carnet card — protagonist, simulated wallet pass */}
          <div
            className="rounded-[28px] overflow-hidden relative"
            style={{
              background: `linear-gradient(160deg, ${dk.card}, ${dk.bg2})`,
              border: `1px solid ${dk.border}`,
              boxShadow:
                "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Top accent bar — wallet pass header strip */}
            <div
              style={{
                height: 5,
                background: `linear-gradient(90deg, ${dk.accent}, color-mix(in oklab, ${dk.accent} 50%, white))`,
              }}
            />

            {/* Subtle radial glow upper-right */}
            <div
              aria-hidden
              className="absolute pointer-events-none rounded-full"
              style={{
                top: -50,
                right: -40,
                width: 220,
                height: 220,
                background: `${dk.accent}26`,
                filter: "blur(50px)",
              }}
            />

            {/* Header — Vetsfriend brand strip */}
            <div
              className="flex items-center justify-between px-6 pt-5 pb-3 relative z-10"
            >
              <p
                className="text-[10px] font-extrabold tracking-[2px]"
                style={{ color: dk.textMuted }}
              >
                VETSFRIEND · CARNET
              </p>
              <div
                className="flex items-center gap-1.5"
                aria-label="Estado"
              >
                <span
                  className="rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    background: "#7df291",
                    boxShadow: "0 0 8px #7df291",
                  }}
                />
                <span
                  className="text-[10px] font-extrabold uppercase tracking-wide"
                  style={{ color: "#7df291" }}
                >
                  Activo
                </span>
              </div>
            </div>

            {/* Pet identity */}
            <div className="px-6 pb-5 flex items-center gap-4 relative z-10">
              <div
                className="rounded-[22px] overflow-hidden flex items-center justify-center text-[44px] shrink-0"
                style={{
                  width: 84,
                  height: 84,
                  background: active.photoUrl
                    ? "transparent"
                    : `linear-gradient(145deg, ${palette.from}, ${palette.to})`,
                  boxShadow: `0 8px 28px ${dk.accent}66`,
                  border: `2px solid color-mix(in oklab, ${dk.accent} 45%, transparent)`,
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
                <p
                  className="text-[9px] font-extrabold tracking-[1.5px] mb-1"
                  style={{ color: dk.textMuted }}
                >
                  NOMBRE
                </p>
                <p
                  className="text-[34px] font-black leading-[0.95] truncate text-white tracking-tight"
                >
                  {active.name}
                </p>
                <p
                  className="text-[13px] font-bold mt-1 truncate"
                  style={{ color: dk.textDim }}
                >
                  {active.breed ?? SPECIES_LABEL[active.species]} ·{" "}
                  {SPECIES_LABEL[active.species]}
                </p>
              </div>
            </div>

            {/* Field grid */}
            <div
              className="grid grid-cols-3 relative z-10"
              style={{ borderTop: `1px solid ${dk.border}` }}
            >
              {fields.map((f, i) => (
                <div
                  key={f.l}
                  className="px-4 py-3"
                  style={{
                    borderRight:
                      (i + 1) % 3 !== 0 ? `1px solid ${dk.border}` : "none",
                    borderBottom:
                      i < 3 ? `1px solid ${dk.border}` : "none",
                  }}
                >
                  <p
                    className="text-[8px] font-extrabold tracking-[1px] mb-1"
                    style={{ color: dk.textMuted }}
                  >
                    {f.l}
                  </p>
                  <p
                    className="text-[13px] font-extrabold truncate"
                    style={{
                      color: dk.text,
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                    }}
                  >
                    {f.v}
                  </p>
                </div>
              ))}
            </div>

            {/* QR + owner / vet */}
            <div className="flex relative z-10">
              <div
                className="flex flex-col items-center gap-2 px-5 py-5 border-r"
                style={{ borderRightColor: dk.border }}
              >
                <CarnetQrCode url={publicUrl} size={108} dark="#1a1035" />
                <p
                  className="text-[8px] font-extrabold tracking-wide text-center"
                  style={{ color: dk.textMuted }}
                >
                  ESCANEAR FICHA
                </p>
              </div>
              <div className="flex-1 px-5 py-5 flex flex-col gap-3 min-w-0">
                <div>
                  <p
                    className="text-[8px] font-extrabold tracking-[1px] mb-0.5"
                    style={{ color: dk.textMuted }}
                  >
                    PROPIETARIO
                  </p>
                  <p
                    className="text-[13px] font-extrabold truncate"
                    style={{ color: dk.text }}
                  >
                    {owner?.name ?? "—"}
                  </p>
                  {owner?.phone && (
                    <p
                      className="text-[12px] font-bold truncate"
                      style={{
                        color: dk.accent,
                        fontFamily: "var(--font-space-grotesk), sans-serif",
                      }}
                    >
                      {owner.phone}
                    </p>
                  )}
                </div>
                <div>
                  <p
                    className="text-[8px] font-extrabold tracking-[1px] mb-0.5"
                    style={{ color: dk.textMuted }}
                  >
                    CLÍNICA
                  </p>
                  <p
                    className="text-[13px] font-extrabold"
                    style={{ color: dk.text }}
                  >
                    Vetsfriend
                  </p>
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: dk.textDim }}
                  >
                    Clínica & Grooming
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom accent — wallet pass footer */}
            <div
              className="px-6 py-3 flex items-center justify-between relative z-10"
              style={{ borderTop: `1px solid ${dk.border}` }}
            >
              <p
                className="text-[9px] font-extrabold tracking-[1.5px]"
                style={{ color: dk.textMuted }}
              >
                EMITIDO · VETSFRIEND
              </p>
              <p
                className="text-[9px] font-extrabold tracking-[1px]"
                style={{
                  color: dk.textMuted,
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                }}
              >
                {active.id.slice(-8).toUpperCase()}
              </p>
            </div>
            <div
              style={{
                height: 4,
                background: `linear-gradient(90deg, ${dk.accent}, color-mix(in oklab, ${dk.accent} 50%, white))`,
              }}
            />
          </div>

          {/* Secondary: Ver cartilla pública (compact link) */}
          <Link
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="self-center inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-extrabold transition"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${dk.border}`,
              color: dk.textDim,
            }}
          >
            <span>↗</span>
            <span>Ver cartilla pública</span>
          </Link>

          <p
            className="text-[11px] text-center font-semibold leading-relaxed"
            style={{ color: dk.textMuted }}
          >
            El QR lleva a la cartilla pública de {active.name} — cualquier vet
            puede ver todo su historial sin cuenta.
          </p>
        </div>
      </div>
    </ClientShellServer>
  );
}
