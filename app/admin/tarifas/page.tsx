import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { SPECIES_EMOJI, SPECIES_LABEL } from "@/lib/utils";
import { TarifasEditor } from "@/components/admin/TarifasEditor";

export const dynamic = "force-dynamic";

const SPECIES = [
  "DOG",
  "CAT",
  "BIRD",
  "RABBIT",
  "HAMSTER",
  "REPTILE",
  "OTHER",
] as const;

export default async function TarifasPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const mods = await prisma.speciesPriceModifier.findMany();
  const map = Object.fromEntries(mods.map((m) => [m.species, m.multiplier]));

  const rows = SPECIES.map((s) => ({
    species: s,
    label: SPECIES_LABEL[s] ?? s,
    emoji: SPECIES_EMOJI[s] ?? "🐾",
    multiplier: map[s] ?? 1,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1
          className="text-[26px] font-black tracking-tight"
          style={{ color: "var(--vet-text-1)" }}
        >
          Tarifas por especie
        </h1>
        <p
          className="text-[13px] font-semibold"
          style={{ color: "var(--vet-text-3)" }}
        >
          Multiplicador aplicado al precio base del servicio. Ej. <b>1.0</b> = sin
          ajuste, <b>1.2</b> = +20%, <b>0.85</b> = −15%.
        </p>
      </div>
      <TarifasEditor rows={rows} />
    </div>
  );
}
