import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PageContainer } from "@/components/ui/page";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import {
  paletteForStyle,
  parsePersonalityTags,
  personalityFor,
  moodFor,
} from "@/lib/pet-flavor";
import { PetdexEditorClient } from "./petdex-editor-client";

export const dynamic = "force-dynamic";

export default async function PersonalizarPage() {
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
      photos: {
        select: { url: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { photos: true } },
      vaccines: { select: { nextAt: true } },
      appointments: {
        where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!pet) {
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
            <p className="text-[48px] mb-3">✨</p>
            <p
              className="text-[16px] font-black mb-1"
              style={{ color: "var(--color-foreground)" }}
            >
              Sin mascota seleccionada
            </p>
            <Link
              href="/mascotas/nueva"
              className="inline-block mt-4 px-5 py-3 rounded-[12px] text-white text-[14px] font-extrabold"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 65%, oklch(45% 0.12 38)))",
              }}
            >
              + Registrar mascota
            </Link>
          </div>
        </PageContainer>
      </ClientShellServer>
    );
  }

  const palette = paletteForStyle(pet);
  const photoCount = pet._count.photos;
  const galleryUrls = [
    pet.photoUrl,
    ...pet.photos.slice(0, 5).map((ph) => ph.url),
  ].filter((u): u is string => !!u);

  const defaultPersonality = personalityFor(pet.species);
  const savedTags = parsePersonalityTags(pet.personalityTags);
  const now = Date.now();
  const defaultMood = moodFor({
    species: pet.species,
    hasUpcoming: pet.appointments.length > 0,
    hasPendingVaccine: pet.vaccines.some(
      (v) => v.nextAt && v.nextAt.getTime() < now
    ),
  });

  return (
    <ClientShellServer>
      <PageContainer className="pb-12">
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="px-1">
            <p
              className="text-[11px] font-extrabold uppercase tracking-[1.5px]"
              style={{ color: "var(--color-muted)" }}
            >
              PERSONALIZAR
            </p>
            <h1
              className="text-[26px] lg:text-[32px] font-black tracking-tight"
              style={{ color: "var(--color-foreground)" }}
            >
              {pet.name}
            </h1>
            <p
              className="text-[12px] font-semibold mt-0.5"
              style={{ color: "var(--color-muted)" }}
            >
              Edita el cuadro como quieras — los cambios se guardan solos.
            </p>
          </div>

          {/* Live editor */}
          <PetdexEditorClient
            petId={pet.id}
            petName={pet.name}
            petSpecies={pet.species}
            petPhotoUrl={pet.photoUrl}
            galleryUrls={galleryUrls}
            defaultMood={defaultMood}
            defaultPersonality={defaultPersonality}
            initial={{
              cardStyle: pet.cardStyle ?? null,
              personalityTags: savedTags,
              customMood: pet.customMood ?? null,
            }}
          />

          {/* More options */}
          <div className="flex flex-col gap-2 mt-2">
            <p
              className="text-[11px] font-extrabold uppercase tracking-[1px] px-1"
              style={{ color: "var(--color-muted)" }}
            >
              Más opciones
            </p>

            <SmallTile
              icon="✏️"
              title="Editar datos"
              subtitle="Nombre, raza, peso, sexo, color, fecha de nacimiento"
              href={`/mascotas/${pet.id}/editar`}
              accent={palette.accent}
            />
            <SmallTile
              icon="📷"
              title="Cambiar foto principal"
              subtitle="La que aparece arriba en el cuadro"
              href={`/mascotas/${pet.id}`}
              accent={palette.accent}
            />
            <SmallTile
              icon="🖼️"
              title="Galería"
              subtitle={`${photoCount} ${photoCount === 1 ? "foto" : "fotos"} subidas — estas son las que rotan en el carrusel`}
              href="/recuerdos"
              accent={palette.accent}
            />
          </div>

          {/* Coming soon */}
          <div className="flex flex-col gap-2 mt-2">
            <p
              className="text-[11px] font-extrabold uppercase tracking-[1px] px-1"
              style={{ color: "var(--color-muted)" }}
            >
              Próximamente
            </p>
            <SmallTile
              icon="🖥️"
              title="Wallpapers"
              subtitle="Genera fondos de pantalla con tus fotos"
              soon
              accent={palette.accent}
            />
            <SmallTile
              icon="🔗"
              title="Imagen para compartir"
              subtitle="Tarjeta lista para Instagram o WhatsApp"
              soon
              accent={palette.accent}
            />
            <SmallTile
              icon="🎂"
              title="Video de cumpleaños"
              subtitle="La app arma el video automáticamente"
              soon
              accent={palette.accent}
            />
            <SmallTile
              icon="🎬"
              title="Resumen del año"
              subtitle="Citas, vacunas y momentos en un mini-video"
              soon
              accent={palette.accent}
            />
          </div>
        </div>
      </PageContainer>
    </ClientShellServer>
  );
}

function SmallTile({
  icon,
  title,
  subtitle,
  href,
  soon,
  accent,
}: {
  icon: string;
  title: string;
  subtitle: string;
  href?: string;
  soon?: boolean;
  accent: string;
}) {
  const inner = (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-[14px] transition"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        opacity: soon ? 0.85 : 1,
      }}
    >
      <div
        className="rounded-[10px] flex items-center justify-center text-[18px] shrink-0"
        style={{
          width: 36,
          height: 36,
          background: `${accent}1a`,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className="text-[13px] font-extrabold truncate"
            style={{ color: "var(--color-foreground)" }}
          >
            {title}
          </p>
          {soon && (
            <span
              className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
              style={{
                background:
                  "color-mix(in oklab, var(--color-muted) 18%, transparent)",
                color: "var(--color-muted)",
              }}
            >
              Pronto
            </span>
          )}
        </div>
        <p
          className="text-[11px] font-semibold leading-snug truncate"
          style={{ color: "var(--color-muted)" }}
        >
          {subtitle}
        </p>
      </div>
      {href && !soon && (
        <span style={{ color: "var(--color-muted)" }}>›</span>
      )}
    </div>
  );

  if (soon || !href) return <div>{inner}</div>;
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}
