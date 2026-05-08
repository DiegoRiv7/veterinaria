/**
 * Pet "flavor" — visual + emotional helpers used by the PetDex home
 * screen. Computes a deterministic palette per pet, plus placeholder
 * personality / mood / fun-fact strings. The personality and fun-fact
 * are stubs we'll wire to real DB fields later.
 */

import type { Pet } from "@/lib/generated/prisma/client";

export type PetPalette = {
  from: string;
  to: string;
  accent: string;
  soft: string;
  ring: string;
};

const PALETTES: PetPalette[] = [
  // Terracotta — primary brand
  {
    from: "oklch(72% 0.16 40)",
    to: "oklch(46% 0.16 38)",
    accent: "oklch(58% 0.16 40)",
    soft: "oklch(94% 0.04 45)",
    ring: "#ce5a2d",
  },
  // Mustard / amber
  {
    from: "oklch(80% 0.14 80)",
    to: "oklch(58% 0.16 60)",
    accent: "oklch(58% 0.16 70)",
    soft: "oklch(95% 0.04 75)",
    ring: "#d49247",
  },
  // Peach
  {
    from: "oklch(78% 0.13 50)",
    to: "oklch(54% 0.16 30)",
    accent: "oklch(60% 0.16 35)",
    soft: "oklch(95% 0.03 50)",
    ring: "#e8a061",
  },
  // Sienna
  {
    from: "oklch(70% 0.14 35)",
    to: "oklch(40% 0.13 30)",
    accent: "oklch(50% 0.15 30)",
    soft: "oklch(94% 0.03 40)",
    ring: "#a8431a",
  },
  // Soft mauve (still warm)
  {
    from: "oklch(72% 0.10 25)",
    to: "oklch(48% 0.12 15)",
    accent: "oklch(54% 0.13 20)",
    soft: "oklch(94% 0.03 25)",
    ring: "#b48cd9",
  },
  // Deep peach
  {
    from: "oklch(76% 0.14 60)",
    to: "oklch(50% 0.14 45)",
    accent: "oklch(58% 0.15 50)",
    soft: "oklch(95% 0.04 55)",
    ring: "#f4a472",
  },
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function paletteFor(pet: { id: string }): PetPalette {
  return PALETTES[hashId(pet.id) % PALETTES.length];
}

const PERSONALITY_BY_SPECIES: Record<string, string[]> = {
  DOG: ["Juguetón", "Leal", "Aventurero"],
  CAT: ["Curioso", "Independiente", "Cariñoso"],
  RABBIT: ["Tierno", "Mañanero", "Saltarín"],
  BIRD: ["Cantor", "Sociable", "Despierto"],
  HAMSTER: ["Inquieto", "Nocturno", "Pequeño explorador"],
  REPTILE: ["Tranquilo", "Misterioso", "Observador"],
  OTHER: ["Único", "Especial", "Querido"],
};

export function personalityFor(species: string): string[] {
  return PERSONALITY_BY_SPECIES[species] ?? PERSONALITY_BY_SPECIES.OTHER;
}

const FUN_FACTS_BY_SPECIES: Record<string, string[]> = {
  DOG: [
    "Adora correr al escuchar la palabra paseo y siempre llega primero a la puerta.",
    "Tiene un lugar favorito en la casa donde se acomoda cada tarde sin falta.",
  ],
  CAT: [
    "Le encanta acurrucarse en el sol de la tarde. Si escucha música clásica, ronronea sin parar.",
    "Tiene un escondite secreto donde guarda sus juguetes favoritos.",
  ],
  RABBIT: [
    "Sale corriendo cada vez que escucha que abren su bolsa de pellets. Tiene el oído de un agente secreto.",
    "Le encanta estirarse cuando está feliz, como si fuera de chicle.",
  ],
  BIRD: [
    "Cada mañana saluda con un repertorio de cantos distinto. Es su forma de decir buenos días.",
  ],
  HAMSTER: [
    "Es el rey de la rueda — corre maratones cada noche mientras todos duermen.",
  ],
  REPTILE: [
    "Prefiere los lugares cálidos y observa todo con calma de filósofo.",
  ],
  OTHER: ["Es completamente original — su personalidad no cabe en una sola frase."],
};

export function funFactFor(pet: { id: string; species: string }): string {
  const list = FUN_FACTS_BY_SPECIES[pet.species] ?? FUN_FACTS_BY_SPECIES.OTHER;
  return list[hashId(pet.id) % list.length];
}

const SPECIES_EMOJI_BIG: Record<string, string[]> = {
  DOG: ["🐶", "🐕", "🦴", "🐾"],
  CAT: ["🐱", "🐈", "😻", "🐾"],
  RABBIT: ["🐰", "🐇", "🥕", "🌿"],
  BIRD: ["🦜", "🐦", "🪶", "🐤"],
  HAMSTER: ["🐹", "🌻", "🥜", "🐾"],
  REPTILE: ["🦎", "🌵", "🦖", "🐾"],
  OTHER: ["🐾", "❤️", "🌟", "✨"],
};

export function bgEmojisFor(species: string): string[] {
  return SPECIES_EMOJI_BIG[species] ?? SPECIES_EMOJI_BIG.OTHER;
}

export function moodFor(opts: {
  species: string;
  hasUpcoming: boolean;
  hasPendingVaccine: boolean;
}): string {
  if (opts.hasPendingVaccine) return "Pendiente de su próxima vacuna 💉";
  if (opts.hasUpcoming) return "Listo para su próxima visita 🐾";
  if (opts.species === "CAT") return "Tranquilo y descansando 😌";
  if (opts.species === "DOG") return "Listo para una aventura 🦴";
  if (opts.species === "RABBIT") return "Activo y saltando 🌿";
  return "En perfecto estado 🌟";
}
