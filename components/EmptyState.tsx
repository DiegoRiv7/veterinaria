import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  emoji = "🐾",
  title,
  description,
  action,
  className,
}: {
  emoji?: string | null;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] bg-[var(--color-surface)]/95 backdrop-blur-sm border border-[var(--color-border)] shadow-[var(--shadow-soft-sm)] py-10 px-6 text-center flex flex-col items-center gap-3",
        className
      )}
    >
      {emoji && (
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-[#ffe5cc] via-[#fbd5b3] to-[#f4b894] blur-xl opacity-70" />
          <div className="text-6xl select-none animate-[bobble_3s_ease-in-out_infinite]">
            {emoji}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-[17px] font-semibold tracking-tight">{title}</p>
        {description && (
          <p className="text-[14px] text-[var(--color-muted)] max-w-[26ch] mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
      <style>{`
        @keyframes bobble {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
}
