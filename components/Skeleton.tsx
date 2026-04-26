import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Generic skeleton block. Pass `className` to control width/height/rounding.
 * Uses Tailwind's `animate-pulse` over a soft surface tone for an elegant
 * placeholder look that fits the pink/sky palette.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse bg-[var(--color-surface-2)] rounded-[8px]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A few stacked text lines of varying width, mimicking copy.
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  // Predefined widths that look natural for body copy.
  const widths = ["w-[92%]", "w-[78%]", "w-[64%]", "w-[85%]", "w-[70%]"];
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5 rounded-full", widths[i % widths.length])}
        />
      ))}
    </div>
  );
}

/**
 * Rounded card placeholder with stacked rows inside. Mirrors `Card` look.
 */
export function SkeletonCard({
  rows = 2,
  className,
  bodyClassName,
}: {
  rows?: number;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface)]/95 backdrop-blur-sm rounded-[16px] shadow-[var(--shadow-soft-sm)] border border-[var(--color-border)]",
        className,
      )}
    >
      <div className={cn("px-5 py-4 flex flex-col gap-2.5", bodyClassName)}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-3.5 rounded-full",
              i === 0 ? "w-[55%] h-4" : i === rows - 1 ? "w-[40%]" : "w-[80%]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * List-row placeholder: round/icon block + 2 stacked lines + small right block.
 * Mirrors the typical card row used across appointments and pet lists.
 */
export function SkeletonRow({
  className,
  iconSize = 48,
  showRight = true,
}: {
  className?: string;
  iconSize?: number;
  showRight?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface)]/95 backdrop-blur-sm rounded-[16px] shadow-[var(--shadow-soft-sm)] border border-[var(--color-border)]",
        className,
      )}
    >
      <div className="px-5 py-4 flex items-center gap-4">
        <Skeleton
          className="rounded-[14px] shrink-0"
          style={{ height: iconSize, width: iconSize }}
        />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Skeleton className="h-4 w-[60%] rounded-full" />
          <Skeleton className="h-3 w-[40%] rounded-full" />
        </div>
        {showRight && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Skeleton className="h-3.5 w-16 rounded-full" />
            <Skeleton className="h-3 w-10 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
