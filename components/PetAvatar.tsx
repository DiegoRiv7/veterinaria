import { SPECIES_EMOJI } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type PetAvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<PetAvatarSize, number> = {
  sm: 36,
  md: 48,
  lg: 64,
  xl: 96,
};

const RADIUS_PX: Record<PetAvatarSize, number> = {
  sm: 14,
  md: 14,
  lg: 18,
  xl: 24,
};

const EMOJI_TEXT: Record<PetAvatarSize, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-5xl",
};

export function PetAvatar({
  photoUrl,
  species,
  name,
  size,
  className,
}: {
  photoUrl?: string | null;
  species: string;
  name?: string;
  size: PetAvatarSize;
  className?: string;
}) {
  const px = SIZE_PX[size];
  const radius = RADIUS_PX[size];
  const style = {
    width: `${px}px`,
    height: `${px}px`,
    borderRadius: `${radius}px`,
  } as const;

  const emoji = SPECIES_EMOJI[species] ?? SPECIES_EMOJI.OTHER;

  if (photoUrl) {
    return (
      <div
        style={style}
        className={cn(
          "overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)] shrink-0",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={name ?? "Mascota"}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      style={style}
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-[#ffe5cc] via-[#fbd5b3] to-[#f4b894] border border-[var(--color-border)] shrink-0",
        EMOJI_TEXT[size],
        className
      )}
      aria-label={name ?? "Mascota"}
    >
      <span aria-hidden>{emoji}</span>
    </div>
  );
}
