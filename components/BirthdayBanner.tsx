import { SPECIES_EMOJI } from "@/lib/utils";

type BirthdayPet = {
  id: string;
  name: string;
  species: string;
  birthDate: Date | null;
};

type Candidate = {
  pet: BirthdayPet;
  daysUntil: number;
  turningAge: number;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function nextBirthday(birthDate: Date, today: Date): { daysUntil: number; turningAge: number } {
  const todayMid = startOfDay(today);
  const month = birthDate.getMonth();
  const day = birthDate.getDate();
  let candidate = new Date(todayMid.getFullYear(), month, day);
  if (candidate.getTime() < todayMid.getTime()) {
    candidate = new Date(todayMid.getFullYear() + 1, month, day);
  }
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntil = Math.round((candidate.getTime() - todayMid.getTime()) / msPerDay);
  const turningAge = candidate.getFullYear() - birthDate.getFullYear();
  return { daysUntil, turningAge };
}

export default function BirthdayBanner({ pets }: { pets: BirthdayPet[] }) {
  const today = new Date();
  const candidates: Candidate[] = [];

  for (const pet of pets) {
    if (!pet.birthDate) continue;
    const bd = pet.birthDate instanceof Date ? pet.birthDate : new Date(pet.birthDate);
    if (Number.isNaN(bd.getTime())) continue;
    const { daysUntil, turningAge } = nextBirthday(bd, today);
    if (daysUntil >= 0 && daysUntil <= 7) {
      candidates.push({ pet, daysUntil, turningAge });
    }
  }

  if (candidates.length === 0) return null;

  // Prioritize today (daysUntil === 0), then soonest.
  candidates.sort((a, b) => a.daysUntil - b.daysUntil);
  const winner = candidates[0];

  const isToday = winner.daysUntil === 0;
  const emoji = SPECIES_EMOJI[winner.pet.species] ?? "🐾";

  const title = isToday
    ? `🎂 ¡Hoy es el cumpleaños de ${winner.pet.name}!`
    : `🎂 ${winner.pet.name} cumple ${winner.turningAge} ${winner.turningAge === 1 ? "año" : "años"} en ${winner.daysUntil} ${winner.daysUntil === 1 ? "día" : "días"}`;

  const subtitle = isToday
    ? `${winner.turningAge} ${winner.turningAge === 1 ? "año" : "años"} de pura felicidad 🐾`
    : `Prepara la fiesta para ${winner.pet.name} ${emoji}`;

  return (
    <div className="relative mb-6 overflow-hidden rounded-[20px] p-5 bg-gradient-to-r from-[#fbbf24] via-[#f472b6] to-[#a78bfa] shadow-[0_14px_40px_rgba(244,114,182,0.32),0_6px_20px_rgba(167,139,250,0.24)]">
      <div className="pointer-events-none absolute -top-6 -right-6 text-[120px] opacity-20 select-none">
        🎉
      </div>
      <div className="relative flex items-center gap-4">
        <div className="h-12 w-12 rounded-[14px] bg-white/30 backdrop-blur flex items-center justify-center text-3xl animate-bounce">
          🎂
        </div>
        <div className="flex-1 text-white">
          <p className="font-semibold text-[17px] leading-tight drop-shadow-sm">{title}</p>
          <p className="text-sm text-white/90 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-3xl select-none animate-pulse" aria-hidden="true">
          ✨
        </div>
      </div>
    </div>
  );
}
