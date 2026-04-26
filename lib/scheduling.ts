import "server-only";
import { prisma } from "./db";

export type Slot = { start: Date; end: Date };

/** Build all candidate slots (based on clinic schedule + slot minutes) for a given calendar day */
export async function slotsForDay(date: Date, durationMinutes: number): Promise<Slot[]> {
  const dow = date.getDay();
  const schedule = await prisma.clinicSchedule.findUnique({ where: { dayOfWeek: dow } });
  if (!schedule || !schedule.isOpen) return [];

  const slotLen = schedule.slotMinutes;
  const slots: Slot[] = [];
  for (let m = schedule.openMinutes; m + durationMinutes <= schedule.closeMinutes; m += slotLen) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(m);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    slots.push({ start, end });
  }
  return slots;
}

/** Return { vetId, slots[] } where slots are available (no overlap with existing appointments) */
export async function availableSlotsForDay(date: Date, durationMinutes: number) {
  const candidates = await slotsForDay(date, durationMinutes);
  if (candidates.length === 0) return [];

  const vets = await prisma.veterinarian.findMany({
    include: { user: true },
  });
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const now = Date.now();
  const appts = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { in: ["SCHEDULED", "COMPLETED"] },
    },
    select: { vetId: true, scheduledAt: true, durationMinutes: true },
  });

  return vets.map((vet) => {
    const taken = appts.filter((a) => a.vetId === vet.id);
    const free = candidates.filter((slot) => {
      if (slot.start.getTime() < now) return false;
      return !taken.some((t) => {
        const tStart = new Date(t.scheduledAt).getTime();
        const tEnd = tStart + t.durationMinutes * 60_000;
        return slot.start.getTime() < tEnd && slot.end.getTime() > tStart;
      });
    });
    return {
      vetId: vet.id,
      vetName: vet.user.name,
      bio: vet.bio,
      photoUrl: vet.photoUrl,
      slots: free,
    };
  });
}

export async function estimatePrice(serviceId: string, species: string): Promise<number> {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
  const mod = await prisma.speciesPriceModifier.findUnique({
    where: { species: species as "DOG" | "CAT" | "BIRD" | "RABBIT" | "HAMSTER" | "REPTILE" | "OTHER" },
  });
  const multiplier = mod?.multiplier ?? 1;
  return Math.round(service.basePrice * multiplier);
}
