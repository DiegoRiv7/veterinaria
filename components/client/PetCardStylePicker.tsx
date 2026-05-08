"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { updatePetCardStyleAction } from "@/app/actions/cartilla";
import {
  paletteByIndex,
  paletteFor,
  PALETTE_COUNT,
  type PetPalette,
} from "@/lib/pet-flavor";

type StyleValue = string | null;

export function PetCardStylePicker({
  petId,
  initialStyle,
}: {
  petId: string;
  initialStyle: StyleValue;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<StyleValue>(initialStyle);

  // The "auto" palette is the deterministic one for this pet — show it as
  // the first swatch so the user knows what they're getting by default.
  const autoPalette = paletteFor({ id: petId });

  function pick(value: StyleValue) {
    if (pending) return;
    const prev = selected;
    setSelected(value);
    startTransition(async () => {
      const result = await updatePetCardStyleAction(
        petId,
        value === null ? "auto" : value
      );
      if (!result.ok) {
        setSelected(prev);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const swatches: { id: StyleValue; label: string; palette: PetPalette }[] = [
    { id: null, label: "Automático", palette: autoPalette },
    ...Array.from({ length: PALETTE_COUNT }, (_, i) => ({
      id: String(i),
      label: `Tono ${i + 1}`,
      palette: paletteByIndex(i),
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Color swatches */}
      <div className="flex flex-wrap gap-2.5">
        {swatches.map((s) => {
          const active =
            (selected === null && s.id === null) || selected === s.id;
          return (
            <button
              key={String(s.id)}
              type="button"
              onClick={() => pick(s.id)}
              disabled={pending}
              aria-label={s.label}
              aria-pressed={active}
              className="relative rounded-full transition disabled:opacity-60"
              style={{
                width: 44,
                height: 44,
                background: `linear-gradient(135deg, ${s.palette.from}, ${s.palette.to})`,
                border: active
                  ? `3px solid ${s.palette.accent}`
                  : "2px solid color-mix(in oklab, var(--color-border) 60%, transparent)",
                boxShadow: active
                  ? `0 4px 14px ${s.palette.accent}66`
                  : "none",
              }}
            >
              {active && (
                <span
                  className="absolute inset-0 flex items-center justify-center text-white"
                  aria-hidden
                >
                  <Check className="h-5 w-5" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Transparent option */}
      <button
        type="button"
        onClick={() => pick("transparent")}
        disabled={pending}
        aria-pressed={selected === "transparent"}
        className="flex items-center gap-3 px-4 py-3 rounded-[14px] transition text-left disabled:opacity-60"
        style={{
          background:
            selected === "transparent"
              ? "color-mix(in oklab, var(--color-brand) 10%, transparent)"
              : "var(--color-surface-2, var(--color-surface))",
          border: `1.5px solid ${
            selected === "transparent"
              ? "var(--color-brand)"
              : "var(--color-border)"
          }`,
        }}
      >
        <div
          className="rounded-[12px] flex items-center justify-center shrink-0 overflow-hidden"
          style={{
            width: 44,
            height: 44,
            background: `
              linear-gradient(45deg, var(--color-border) 25%, transparent 25%) 0 0/12px 12px,
              linear-gradient(-45deg, var(--color-border) 25%, transparent 25%) 0 6px/12px 12px,
              linear-gradient(45deg, transparent 75%, var(--color-border) 75%) 6px -6px/12px 12px,
              linear-gradient(-45deg, transparent 75%, var(--color-border) 75%) -6px 0/12px 12px,
              var(--color-surface)`,
          }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-extrabold"
            style={{ color: "var(--color-foreground)" }}
          >
            Transparente
          </p>
          <p
            className="text-[12px] font-semibold"
            style={{ color: "var(--color-muted)" }}
          >
            Sin tinte de color — tus fotos son las protagonistas
          </p>
        </div>
        {selected === "transparent" && (
          <span style={{ color: "var(--color-brand)" }}>
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
        )}
      </button>

      {pending && (
        <p
          className="flex items-center gap-1.5 text-[12px] font-semibold"
          style={{ color: "var(--color-muted)" }}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando…
        </p>
      )}
    </div>
  );
}
