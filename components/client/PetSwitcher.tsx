"use client";
import { SPECIES_EMOJI } from "@/lib/utils";
import type { PetPalette } from "@/lib/pet-flavor";

export type PetSwitcherItem = {
  id: string;
  name: string;
  species: string;
  photoUrl: string | null;
  palette: PetPalette;
};

export function PetSwitcher({
  pets,
  activeId,
  onSelect,
  onAdd,
}: {
  pets: PetSwitcherItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="flex justify-center gap-3 flex-wrap">
      {pets.map((pet) => {
        const active = pet.id === activeId;
        const size = active ? 50 : 38;
        return (
          <button
            key={pet.id}
            type="button"
            onClick={() => onSelect(pet.id)}
            className="rounded-full overflow-hidden flex items-center justify-center transition-all"
            style={{
              width: size,
              height: size,
              fontSize: active ? 26 : 19,
              background: pet.photoUrl
                ? "transparent"
                : `linear-gradient(135deg, ${pet.palette.from}, ${pet.palette.to})`,
              border: active
                ? `3px solid ${pet.palette.accent}`
                : "2.5px solid rgba(0,0,0,0.08)",
              boxShadow: active ? `0 4px 18px ${pet.palette.accent}55` : "none",
            }}
            aria-pressed={active}
            aria-label={pet.name}
          >
            {pet.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pet.photoUrl}
                alt={pet.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{SPECIES_EMOJI[pet.species] || "🐾"}</span>
            )}
          </button>
        );
      })}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Agregar mascota"
          className="rounded-full flex items-center justify-center text-[18px]"
          style={{
            width: 38,
            height: 38,
            background: "var(--color-surface)",
            border: "2px dashed var(--color-border)",
            color: "var(--color-muted)",
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
