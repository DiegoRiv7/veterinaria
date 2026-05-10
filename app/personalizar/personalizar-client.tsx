"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles, Frame, Heart } from "lucide-react";
import { PetdexEditorClient } from "./petdex-editor-client";
import { PetGallery } from "@/components/PetGallery";

type TabId = "mascota" | "fondos" | "recuerdos";

const TABS: { id: TabId; icon: typeof Sparkles; label: string; sub: string }[] = [
  {
    id: "mascota",
    icon: Sparkles,
    label: "Personalizar",
    sub: "Edita el cuadro",
  },
  {
    id: "fondos",
    icon: Frame,
    label: "Fondos",
    sub: "Wallpapers",
  },
  {
    id: "recuerdos",
    icon: Heart,
    label: "Recuerdos",
    sub: "Galería y compartir",
  },
];

export type PersonalizarPayload = {
  pet: {
    id: string;
    name: string;
    species: string;
    photoUrl: string | null;
    cardStyle: string | null;
  };
  galleryUrls: string[];
  initialPhotos: { id: string; url: string }[];
  defaultMood: string;
  defaultPersonality: string[];
  defaultFunFact: string;
  savedPersonalityTags: string[] | null;
  customMood: string | null;
  customFunFact: string | null;
  paletteAccent: string;
};

export function PersonalizarClient({
  payload,
}: {
  payload: PersonalizarPayload;
}) {
  const [tab, setTab] = useState<TabId>("mascota");
  const accent = payload.paletteAccent;

  return (
    <div className="flex flex-col gap-5">
      {/* Tab strip — sticky-ish */}
      <div
        className="sticky top-0 z-20 -mx-4 px-4 py-3"
        style={{
          background:
            "color-mix(in oklab, var(--color-surface) 86%, transparent)",
          backdropFilter: "blur(18px) saturate(160%)",
          WebkitBackdropFilter: "blur(18px) saturate(160%)",
        }}
      >
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full transition-colors whitespace-nowrap"
                style={{
                  background: isActive
                    ? accent
                    : "var(--color-surface)",
                  border: `1px solid ${
                    isActive ? accent : "var(--color-border)"
                  }`,
                  color: isActive ? "white" : "var(--color-foreground)",
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 13,
                }}
                aria-pressed={isActive}
              >
                <Icon
                  className="h-[15px] w-[15px]"
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "mascota" && <MascotaTab payload={payload} />}
      {tab === "fondos" && (
        <FondosTab
          petId={payload.pet.id}
          petName={payload.pet.name}
          accent={accent}
        />
      )}
      {tab === "recuerdos" && <RecuerdosTab payload={payload} />}
    </div>
  );
}

function MascotaTab({ payload }: { payload: PersonalizarPayload }) {
  return (
    <>
      <PetdexEditorClient
        petId={payload.pet.id}
        petName={payload.pet.name}
        petSpecies={payload.pet.species}
        petPhotoUrl={payload.pet.photoUrl}
        galleryUrls={payload.galleryUrls}
        defaultMood={payload.defaultMood}
        defaultPersonality={payload.defaultPersonality}
        defaultFunFact={payload.defaultFunFact}
        initial={{
          cardStyle: payload.pet.cardStyle,
          personalityTags: payload.savedPersonalityTags,
          customMood: payload.customMood,
          customFunFact: payload.customFunFact,
        }}
      />

      <SectionTitle>Más opciones</SectionTitle>
      <SmallTile
        icon="✏️"
        title="Editar datos completos"
        subtitle="Nombre, raza, peso, sexo, color, fecha de nacimiento"
        href={`/mascotas/${payload.pet.id}/editar`}
        accent={payload.paletteAccent}
      />
      <SmallTile
        icon="📷"
        title="Cambiar foto principal"
        subtitle="La que aparece arriba en el cuadro"
        href={`/mascotas/${payload.pet.id}`}
        accent={payload.paletteAccent}
      />
    </>
  );
}

function FondosTab({
  petId,
  petName,
  accent,
}: {
  petId: string;
  petName: string;
  accent: string;
}) {
  const formats = [
    {
      key: "mobile",
      icon: "📱",
      title: "Móvil",
      subtitle: "Vertical 1170×2532 — para iPhone y Android",
      filename: `vetsfriend-${petName.toLowerCase()}-movil.png`,
    },
    {
      key: "desktop",
      icon: "💻",
      title: "Escritorio",
      subtitle: "Horizontal 1920×1080 para computadora",
      filename: `vetsfriend-${petName.toLowerCase()}-desktop.png`,
    },
    {
      key: "square",
      icon: "🟦",
      title: "Cuadrado",
      subtitle: "1080×1080 — Instagram post o feed cuadrado",
      filename: `vetsfriend-${petName.toLowerCase()}-cuadrado.png`,
    },
  ];

  return (
    <>
      <div
        className="rounded-[20px] p-5 lg:p-6"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 12%, var(--color-surface)), var(--color-surface))`,
          border: `1.5px solid color-mix(in oklab, ${accent} 28%, var(--color-border))`,
        }}
      >
        <p
          className="text-[15px] font-black mb-1"
          style={{ color: "var(--color-foreground)" }}
        >
          Fondos de pantalla con {petName}
        </p>
        <p
          className="text-[13px] font-semibold leading-snug"
          style={{ color: "var(--color-muted)" }}
        >
          Generamos un wallpaper con la foto principal de {petName}, su
          nombre y la frase que pusiste en el cuadro. Tap para descargar.
        </p>
      </div>
      {formats.map((f) => (
        <a
          key={f.key}
          href={`/api/wallpaper/${petId}?format=${f.key}`}
          download={f.filename}
          className="flex items-center gap-3 px-4 py-3 rounded-[14px] transition hover:brightness-[1.02]"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="rounded-[10px] flex items-center justify-center text-[20px] shrink-0"
            style={{
              width: 42,
              height: 42,
              background: `${accent}1a`,
            }}
          >
            {f.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[14px] font-extrabold"
              style={{ color: "var(--color-foreground)" }}
            >
              {f.title}
            </p>
            <p
              className="text-[12px] font-semibold leading-snug"
              style={{ color: "var(--color-muted)" }}
            >
              {f.subtitle}
            </p>
          </div>
          <span
            className="text-[12px] font-extrabold px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{
              background: accent,
              color: "white",
            }}
          >
            ↓ Descargar
          </span>
        </a>
      ))}
      <SmallTile
        icon="🎬"
        title="Wallpaper animado"
        subtitle="Loop de tus fotos del carrusel — iPhone live wallpaper"
        soon
        accent={accent}
      />
    </>
  );
}

function RecuerdosTab({ payload }: { payload: PersonalizarPayload }) {
  const accent = payload.paletteAccent;
  return (
    <>
      <SectionTitle>Galería de fotos</SectionTitle>
      <p
        className="text-[12px] font-semibold -mt-1 px-1"
        style={{ color: "var(--color-muted)" }}
      >
        Estas son las que rotan en el carrusel del cuadro y aparecen en la
        cartilla pública.
      </p>
      <PetGallery
        petId={payload.pet.id}
        petName={payload.pet.name}
        initialPhotos={payload.initialPhotos}
      />

      <SectionTitle>Comparte tus recuerdos</SectionTitle>
      <SmallTile
        icon="🔗"
        title="Imagen para compartir"
        subtitle="Tarjeta lista para Instagram o WhatsApp"
        soon
        accent={accent}
      />
      <SmallTile
        icon="🎂"
        title="Video de cumpleaños"
        subtitle={`Cuando ${payload.pet.name} cumple, la app arma su clip automático`}
        soon
        accent={accent}
      />
      <SmallTile
        icon="🎬"
        title="Resumen del año"
        subtitle="Citas, vacunas y momentos en un mini-video"
        soon
        accent={accent}
      />
      <SmallTile
        icon="🐾"
        title="Comunidad"
        subtitle="Comparte logros con otros dueños — pronto"
        soon
        accent={accent}
      />
    </>
  );
}

function ComingSoonHero({
  emoji,
  title,
  subtitle,
  accent,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-[20px] p-5 lg:p-6 flex items-start gap-4"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 12%, var(--color-surface)), var(--color-surface))`,
        border: `1.5px solid color-mix(in oklab, ${accent} 28%, var(--color-border))`,
      }}
    >
      <div
        className="rounded-[14px] flex items-center justify-center text-[26px] shrink-0"
        style={{
          width: 52,
          height: 52,
          background: `${accent}22`,
        }}
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[15px] font-black mb-1"
          style={{ color: "var(--color-foreground)" }}
        >
          {title}
        </p>
        <p
          className="text-[13px] font-semibold leading-snug"
          style={{ color: "var(--color-muted)" }}
        >
          {subtitle}
        </p>
        <span
          className="inline-block mt-2 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{
            background: `${accent}22`,
            color: accent,
            border: `1px solid ${accent}55`,
          }}
        >
          Próximamente
        </span>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-extrabold uppercase tracking-[1px] px-1 mt-2"
      style={{ color: "var(--color-muted)" }}
    >
      {children}
    </p>
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
          width: 38,
          height: 38,
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
              className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
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
