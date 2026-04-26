// Generic logo placeholder — swap with real brand asset later.
import { cn } from "@/lib/utils";

function PawMark({ size = 32, color = "#ffffff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill={color} aria-hidden>
      <ellipse cx="18" cy="20" rx="5.5" ry="7.5" transform="rotate(-15 18 20)" />
      <ellipse cx="46" cy="20" rx="5.5" ry="7.5" transform="rotate(15 46 20)" />
      <ellipse cx="9" cy="36" rx="4.5" ry="6.5" transform="rotate(-25 9 36)" />
      <ellipse cx="55" cy="36" rx="4.5" ry="6.5" transform="rotate(25 55 36)" />
      <path d="M32 30 C 22 30, 16 39, 16 47 C 16 55, 23 59, 32 59 C 41 59, 48 55, 48 47 C 48 39, 42 30, 32 30 Z" />
    </svg>
  );
}

export function BrandLogo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-20 w-20" : "h-16 w-16";
  const paw = size === "sm" ? 22 : size === "lg" ? 40 : 30;
  const titleSize = size === "sm" ? "text-[14px]" : size === "lg" ? "text-[20px]" : "text-[16px]";

  return (
    <div className={cn("flex flex-col items-center gap-2.5", className)}>
      <div
        className={cn(
          dims,
          "rounded-[22px] bg-gradient-to-br from-[#0ea5e9] via-[#6366f1] to-[#ec4899] flex items-center justify-center shadow-[var(--shadow-soft-md)] ring-1 ring-white/40"
        )}
      >
        <PawMark size={paw} />
      </div>
      <div className="text-center leading-tight">
        <p className={cn(titleSize, "font-semibold tracking-tight text-[var(--color-foreground)]")}>
          Patitas Felices
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-2)] mt-0.5">
          Tu logo aquí
        </p>
      </div>
    </div>
  );
}
