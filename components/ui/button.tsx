import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none select-none",
  {
    variants: {
      variant: {
        primary:
          "[background-image:var(--button-primary-bg)] text-[color:var(--button-primary-text)] shadow-[var(--button-primary-shadow)] hover:brightness-[1.03]",
        secondary:
          "bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] shadow-[var(--shadow-soft-sm)]",
        ghost:
          "bg-transparent text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]",
        danger:
          "bg-[var(--color-danger)] text-white hover:brightness-110 shadow-[var(--shadow-soft-sm)]",
        dangerSoft:
          "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border border-[var(--color-danger)]/15 hover:bg-[#ffd5dc]/80",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-[10px]",
        md: "h-11 px-4 text-[15px] rounded-[12px]",
        lg: "h-13 px-5 text-base rounded-[14px] min-h-[52px]",
        xl: "h-14 px-6 text-base rounded-[16px] min-h-[56px] w-full font-semibold",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
