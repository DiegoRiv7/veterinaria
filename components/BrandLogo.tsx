import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { w: 160, className: "w-[160px]" },
  md: { w: 220, className: "w-[220px]" },
  lg: { w: 280, className: "w-[280px]" },
};

export function BrandLogo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={cn("flex justify-center", className)}>
      <Image
        src="/vetsfriend-logo.png"
        alt="Vetsfriend — Clínica & Grooming"
        width={s.w}
        height={Math.round(s.w * 0.61)}
        priority
        className={cn(s.className, "h-auto")}
      />
    </div>
  );
}
