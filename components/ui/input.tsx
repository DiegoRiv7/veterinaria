import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] px-4 text-[15px] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-2)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition shadow-[var(--shadow-soft-sm)] appearance-none",
        className
      )}
      style={{
        // Force iOS Safari to honor the box height for type="date" /
        // type="number" / type="text" identically — without this, the
        // date picker chevron pushes the box ~6px taller than siblings.
        WebkitAppearance: "none",
        minHeight: 48,
        boxSizing: "border-box",
        ...style,
      }}
      {...props}
    />
  )
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[96px] w-full rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] p-4 text-[15px] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-2)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition resize-y shadow-[var(--shadow-soft-sm)]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-12 w-full rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] px-3 text-[15px] text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition appearance-none shadow-[var(--shadow-soft-sm)]",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-[12px] font-medium text-[var(--color-muted)] mb-1.5 uppercase tracking-[0.06em]", className)}
      {...props}
    />
  );
}
