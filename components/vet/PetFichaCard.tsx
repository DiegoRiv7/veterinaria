import Link from "next/link";
import {
  SPECIES_LABEL,
  SEX_LABEL,
  ageFromBirthDate,
} from "@/lib/utils";

type PetForFicha = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: Date | null;
  weightKg: number | null;
  sex: string;
  color: string | null;
  sterilized: boolean;
  microchipId: string | null;
};

function formatLong(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function PetFichaCard({
  pet,
  cartillaHref,
}: {
  pet: PetForFicha;
  cartillaHref: string;
}) {
  const age = ageFromBirthDate(pet.birthDate) ?? "—";
  const rows: { label: string; value: string }[] = [
    { label: "Fecha de nacimiento", value: formatLong(pet.birthDate) },
    { label: "Edad", value: age },
    { label: "Especie", value: SPECIES_LABEL[pet.species] ?? pet.species },
    { label: "Raza", value: pet.breed?.trim() || "—" },
    {
      label: "Peso",
      value: pet.weightKg ? `${pet.weightKg} kg` : "—",
    },
    { label: "Género", value: SEX_LABEL[pet.sex] ?? "—" },
    { label: "Color", value: pet.color?.trim() || "—" },
    {
      label: "Esterilizado/a",
      value: pet.sterilized ? "Sí ✓" : "No",
    },
    {
      label: "Microchip",
      value: pet.microchipId?.trim() || "—",
    },
  ];

  return (
    <section
      className="border overflow-hidden"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        borderRadius: 22,
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b"
        style={{ borderBottomColor: "var(--vet-border)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[20px]">🪪</span>
          <h2
            className="text-[15px] font-black truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            Ficha de {pet.name}
          </h2>
        </div>
        <Link
          href={cartillaHref}
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-[10px] text-[12px] font-extrabold text-white no-underline transition-all hover:brightness-105"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
            boxShadow: "0 4px 12px var(--vet-green-glow)",
          }}
        >
          📋 Ver cartilla →
        </Link>
      </div>

      {/* On desktop the rows split into two columns (label/value side-by-side
          in each column). On mobile we collapse to a single column list. */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {rows.map((r, i) => {
          const onLeftColumn = i % 2 === 0;
          const isLastLeft =
            onLeftColumn && i >= rows.length - 2;
          const isLastRight =
            !onLeftColumn && i === rows.length - 1;
          return (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5"
              style={{
                borderBottom:
                  isLastLeft || isLastRight
                    ? "none"
                    : "1px solid color-mix(in oklab, var(--vet-border) 65%, transparent)",
                borderRight:
                  onLeftColumn
                    ? "1px solid color-mix(in oklab, var(--vet-border) 65%, transparent)"
                    : "none",
              }}
            >
              <span
                className="text-[12px] font-bold uppercase tracking-wider"
                style={{ color: "var(--vet-text-3)" }}
              >
                {r.label}
              </span>
              <span
                className="text-[14px] font-extrabold text-right truncate"
                style={{ color: "var(--vet-text-1)" }}
              >
                {r.value}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
