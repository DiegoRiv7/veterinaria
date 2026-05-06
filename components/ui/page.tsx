import * as React from "react";
import { cn } from "@/lib/utils";

export function AppShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("min-h-dvh flex flex-col relative z-10", className)}>{children}</div>;
}

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[720px] lg:max-w-[1040px] px-4 lg:px-8 pb-32 pt-6 lg:pt-8 relative z-10",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="min-w-0">
        <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)] leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[15px] text-[var(--color-muted)]">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--color-muted)] px-1 mb-2.5 mt-7", className)}>
      {children}
    </h2>
  );
}
