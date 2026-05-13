import Link from "next/link";
import {
  paletteForStyle,
  personalityForPet,
  funFactFor,
  isTransparentStyle,
} from "@/lib/pet-flavor";
import { SPECIES_EMOJI, SPECIES_LABEL } from "@/lib/utils";

type PetForFicha = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photoUrl: string | null;
  cardStyle: string | null;
  personalityTags: string | null;
  customMood: string | null;
  customFunFact: string | null;
};

export function PetFichaCard({
  pet,
  cartillaHref,
}: {
  pet: PetForFicha;
  cartillaHref: string;
}) {
  const palette = paletteForStyle(pet);
  const transparent = isTransparentStyle(pet.cardStyle);
  const personality = personalityForPet({
    species: pet.species,
    personalityTags: pet.personalityTags,
  });
  const mood =
    pet.customMood?.trim() ||
    (pet.species === "CAT"
      ? "Tranquilo y descansando 😌"
      : pet.species === "DOG"
      ? "Listo para una aventura 🦴"
      : "En perfecto estado 🌟");
  const funFact =
    pet.customFunFact?.trim() || funFactFor({ id: pet.id, species: pet.species });

  return (
    <div
      className="border overflow-hidden relative"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        borderRadius: 22,
      }}
    >
      {/* Painted hero band — uses the pet's saved palette so the card matches
          what the owner sees in /inicio. */}
      <div
        className="relative px-6 pt-6 pb-7"
        style={{
          background: transparent
            ? "var(--vet-bg-mid)"
            : `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-[20px] overflow-hidden flex items-center justify-center text-[36px] flex-shrink-0 border-2"
            style={{
              borderColor: "rgba(255,255,255,0.35)",
              background: pet.photoUrl
                ? "rgba(255,255,255,0.10)"
                : "rgba(255,255,255,0.18)",
              boxShadow: "0 8px 22px rgba(0,0,0,0.20)",
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
              <span>{SPECIES_EMOJI[pet.species] ?? "🐾"}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-white/80"
            >
              Ficha
            </p>
            <h2
              className="text-white text-[28px] font-black tracking-tight leading-tight"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
            >
              {pet.name}
            </h2>
            <p
              className="text-white/90 text-[13px] font-semibold mt-0.5"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.20)" }}
            >
              {SPECIES_LABEL[pet.species] ?? pet.species}
              {pet.breed ? ` · ${pet.breed}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col gap-4">
        {/* Personality chips */}
        {personality.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {personality.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-extrabold px-2.5 py-1 rounded-full"
                style={{
                  background: palette.soft,
                  color: palette.accent,
                  border: `1px solid color-mix(in oklab, ${palette.ring} 32%, transparent)`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Mood */}
        <div
          className="rounded-[14px] px-4 py-3 flex items-center gap-3"
          style={{
            background: "var(--vet-bg-mid)",
            border: "1px solid var(--vet-border)",
          }}
        >
          <span className="text-[20px]">💭</span>
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-extrabold uppercase tracking-wider"
              style={{ color: "var(--vet-text-3)" }}
            >
              Cómo se siente
            </p>
            <p
              className="text-[13px] font-extrabold leading-snug"
              style={{ color: "var(--vet-text-1)" }}
            >
              {mood}
            </p>
          </div>
        </div>

        {/* Fun fact */}
        <div
          className="rounded-[14px] px-4 py-3"
          style={{
            background: "var(--vet-bg-mid)",
            border: "1px solid var(--vet-border)",
          }}
        >
          <p
            className="text-[10px] font-extrabold uppercase tracking-wider mb-1"
            style={{ color: "var(--vet-text-3)" }}
          >
            Algo especial de {pet.name}
          </p>
          <p
            className="text-[13px] font-semibold leading-relaxed"
            style={{ color: "var(--vet-text-2)" }}
          >
            {funFact}
          </p>
        </div>

        {/* Cartilla CTA */}
        <Link
          href={cartillaHref}
          className="mt-1 inline-flex items-center justify-center gap-2 h-12 rounded-[14px] text-[14px] font-extrabold no-underline transition-colors"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
            color: "white",
            boxShadow: "0 8px 22px var(--vet-green-glow)",
          }}
        >
          📋 Ver cartilla completa
        </Link>
      </div>
    </div>
  );
}
