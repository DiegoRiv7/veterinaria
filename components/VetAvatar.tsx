import { cn } from "@/lib/utils";

export type VetAvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<VetAvatarSize, number> = {
  sm: 36,
  md: 48,
  lg: 64,
  xl: 96,
};

const TEXT_SIZE: Record<VetAvatarSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-4xl",
};

const HONORIFICS = new Set(["dr", "dra", "dr.", "dra."]);

function initialFor(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  for (const p of parts) {
    if (!HONORIFICS.has(p.toLowerCase())) {
      const ch = p.charAt(0);
      if (ch) return ch.toUpperCase();
    }
  }
  // Fallback: last word's first letter
  const last = parts[parts.length - 1] ?? "";
  return (last.charAt(0) || "?").toUpperCase();
}

export function VetAvatar({
  photoUrl,
  name,
  size,
  className,
}: {
  photoUrl?: string | null;
  name: string;
  size: VetAvatarSize;
  className?: string;
}) {
  const px = SIZE_PX[size];
  const style = {
    width: `${px}px`,
    height: `${px}px`,
  } as const;

  if (photoUrl) {
    return (
      <div
        style={style}
        className={cn(
          "overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] shrink-0",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={name || "Veterinario"}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  const letter = initialFor(name);
  return (
    <div
      style={style}
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-[#dbeafe] via-[#ede9fe] to-[#fce7f3] border border-[var(--color-border)] shrink-0 font-semibold text-[var(--color-foreground)]",
        TEXT_SIZE[size],
        className
      )}
      aria-label={name || "Veterinario"}
    >
      <span aria-hidden>{letter}</span>
    </div>
  );
}
