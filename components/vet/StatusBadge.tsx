type Variant = "agendada" | "completada" | "cancelada" | "no-show" | "en-curso" | "info" | "warning";

const STYLES: Record<Variant, { bg: string; text: string; border: string; label?: string }> = {
  agendada:   { bg: "oklch(48% 0.18 155 / 0.12)", text: "oklch(36% 0.16 155)", border: "oklch(48% 0.18 155 / 0.28)", label: "Agendada"   },
  "en-curso": { bg: "oklch(50% 0.18 300 / 0.12)", text: "oklch(38% 0.16 300)", border: "oklch(50% 0.18 300 / 0.28)", label: "En curso"   },
  completada: { bg: "oklch(52% 0.22 255 / 0.12)", text: "oklch(40% 0.20 255)", border: "oklch(52% 0.22 255 / 0.28)", label: "Completada" },
  cancelada:  { bg: "oklch(52% 0.20 20 / 0.12)",  text: "oklch(40% 0.18 20)",  border: "oklch(52% 0.20 20 / 0.28)",  label: "Cancelada"  },
  "no-show":  { bg: "oklch(62% 0.17 55 / 0.12)",  text: "oklch(48% 0.15 55)",  border: "oklch(62% 0.17 55 / 0.28)",  label: "No vino"    },
  info:       { bg: "oklch(52% 0.22 255 / 0.12)", text: "oklch(40% 0.20 255)", border: "oklch(52% 0.22 255 / 0.28)" },
  warning:    { bg: "oklch(62% 0.17 55 / 0.12)",  text: "oklch(48% 0.15 55)",  border: "oklch(62% 0.17 55 / 0.28)" },
};

export function StatusBadge({ variant, children }: { variant: Variant; children?: React.ReactNode }) {
  const s = STYLES[variant];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-[0.3px] whitespace-nowrap border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {children ?? s.label}
    </span>
  );
}

export function statusToVariant(status: string): Variant {
  switch (status) {
    case "SCHEDULED":
      return "agendada";
    case "COMPLETED":
      return "completada";
    case "CANCELLED":
      return "cancelada";
    case "NO_SHOW":
      return "no-show";
    default:
      return "info";
  }
}
