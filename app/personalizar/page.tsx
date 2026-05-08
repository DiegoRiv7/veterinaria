import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PageContainer } from "@/components/ui/page";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import { paletteFor, bgEmojisFor } from "@/lib/pet-flavor";
import { SPECIES_LABEL, ageFromBirthDate } from "@/lib/utils";

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
      _count: { select: { photos: true } },
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

  const palette = paletteFor(pet);
  const age = ageFromBirthDate(pet.birthDate) ?? "—";
  const photoCount = pet._count.photos;

  type Tile = {
    icon: string;
    title: string;
    subtitle: string;
    href?: string;
    soon?: boolean;
    accent?: boolean;
  };

  const editor: Tile[] = [
    {
      icon: "✏️",
      title: "Editar datos",
      subtitle: "Nombre, raza, peso, sexo, color, fecha de nacimiento",
      href: `/mascotas/${pet.id}/editar`,
    },
    {
      icon: "📷",
      title: "Cambiar foto principal",
      subtitle: "La que aparece en el carrusel y todo el resto de la app",
      href: `/mascotas/${pet.id}`,
    },
    {
      icon: "🖼️",
      title: "Galería",
      subtitle: `${photoCount} ${photoCount === 1 ? "foto" : "fotos"} subidas · estas son las que rotan en el carrusel`,
      href: "/recuerdos",
    },
  ];

  const visualPersonalization: Tile[] = [
    {
      icon: "🎨",
      title: "Color del fondo",
      subtitle: `Actualmente usa la paleta automática (${pet.species.toLowerCase()})`,
      soon: true,
    },
    {
      icon: "🪟",
      title: "Fondo transparente",
      subtitle: "Para que tus fotos sean las protagonistas, sin tinte de color",
      soon: true,
    },
  ];

  const sharing: Tile[] = [
    {
      icon: "🖥️",
      title: "Wallpapers",
      subtitle: "Genera fondos de pantalla con las fotos de tu mascota",
      soon: true,
      accent: true,
    },
    {
      icon: "🔗",
      title: "Imagen para compartir",
      subtitle: "Una tarjeta lista para Instagram / WhatsApp",
      soon: true,
      accent: true,
    },
  ];

  const future: Tile[] = [
    {
      icon: "🎂",
      title: "Video de cumpleaños",
      subtitle: `${pet.name} cumple — la app lo arma solo`,
      soon: true,
    },
    {
      icon: "🎬",
      title: "Resumen del año",
      subtitle: `Citas, vacunas, fotos y momentos de ${pet.name} en un mini-video`,
      soon: true,
    },
    {
      icon: "🐾",
      title: "Comunidad",
      subtitle: "Comparte logros con otros dueños — próximamente social",
      soon: true,
    },
  ];

  return (
    <ClientShellServer>
      <PageContainer className="pb-12">
        <div className="flex flex-col gap-5">
          {/* Hero */}
          <section
            className="rounded-[22px] p-5 flex items-center gap-4"
            style={{
              background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
              boxShadow: `0 14px 38px ${palette.accent}33`,
            }}
          >
            <div
              className="rounded-full overflow-hidden flex items-center justify-center text-[34px] shrink-0"
              style={{
                width: 70,
                height: 70,
                background: pet.photoUrl
                  ? "transparent"
                  : "rgba(255,255,255,0.18)",
                border: "2.5px solid rgba(255,255,255,0.35)",
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
            <div className="min-w-0 flex-1 text-white">
              <p className="text-[10px] font-extrabold tracking-[1.5px] opacity-80">
                PERSONALIZAR
              </p>
              <p className="text-[24px] lg:text-[28px] font-black tracking-tight leading-tight">
                {pet.name}
              </p>
              <p className="text-[12px] font-bold opacity-90 truncate">
                {pet.breed ?? SPECIES_LABEL[pet.species]} · {age}
              </p>
            </div>
          </section>

          <Section title="Información" subtitle="Datos y fotos del perfil">
            {editor.map((t) => (
              <TileCard key={t.title} tile={t} accent={palette.accent} />
            ))}
          </Section>

          <Section
            title="Apariencia"
            subtitle="Cómo se ve el cuadro de tu mascota"
          >
            {visualPersonalization.map((t) => (
              <TileCard key={t.title} tile={t} accent={palette.accent} />
            ))}
          </Section>

          <Section
            title="Crear y compartir"
            subtitle="Saca lo mejor de las fotos de tu mascota"
          >
            {sharing.map((t) => (
              <TileCard key={t.title} tile={t} accent={palette.accent} />
            ))}
          </Section>

          <Section
            title="Próximamente"
            subtitle="Funciones que vienen — preparándose para una app social"
          >
            {future.map((t) => (
              <TileCard key={t.title} tile={t} accent={palette.accent} />
            ))}
          </Section>
        </div>
      </PageContainer>
    </ClientShellServer>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="px-1">
        <p
          className="text-[11px] font-extrabold uppercase tracking-[1px]"
          style={{ color: "var(--color-muted)" }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="text-[12px] font-semibold mt-0.5"
            style={{ color: "var(--color-muted)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function TileCard({
  tile,
  accent,
}: {
  tile: {
    icon: string;
    title: string;
    subtitle: string;
    href?: string;
    soon?: boolean;
    accent?: boolean;
  };
  accent: string;
}) {
  const inner = (
    <div
      className="flex items-center gap-3.5 px-4 py-3.5 rounded-[16px] transition"
      style={{
        background: tile.accent
          ? `color-mix(in oklab, ${accent} 8%, var(--color-surface))`
          : "var(--color-surface)",
        border: `1px solid ${
          tile.accent
            ? `color-mix(in oklab, ${accent} 22%, var(--color-border))`
            : "var(--color-border)"
        }`,
        opacity: tile.soon ? 0.85 : 1,
      }}
    >
      <div
        className="rounded-[12px] flex items-center justify-center text-[22px] shrink-0"
        style={{
          width: 44,
          height: 44,
          background: `${accent}1a`,
        }}
      >
        {tile.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p
            className="text-[14px] font-extrabold"
            style={{ color: "var(--color-foreground)" }}
          >
            {tile.title}
          </p>
          {tile.soon && (
            <span
              className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
              style={{
                background: "color-mix(in oklab, var(--color-muted) 18%, transparent)",
                color: "var(--color-muted)",
              }}
            >
              Pronto
            </span>
          )}
        </div>
        <p
          className="text-[12px] font-semibold leading-snug"
          style={{ color: "var(--color-muted)" }}
        >
          {tile.subtitle}
        </p>
      </div>
      {!tile.soon && tile.href && (
        <span
          className="text-[18px] shrink-0"
          style={{ color: "var(--color-muted)" }}
        >
          ›
        </span>
      )}
    </div>
  );

  if (tile.soon || !tile.href) {
    return <div className="cursor-not-allowed">{inner}</div>;
  }
  return (
    <Link href={tile.href} className="block">
      {inner}
    </Link>
  );
}
