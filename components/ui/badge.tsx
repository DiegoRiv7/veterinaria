import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "brand" | "success" | "warning" | "danger" | "neutral";

const styles: Record<Variant, string> = {
  brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
