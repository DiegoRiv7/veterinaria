import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CLINIC_TIME_ZONE, formatClinicTime } from "./clinic-time";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: CLINIC_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function formatTime(date: Date | string) {
  // Siempre en hora de la clínica — ver lib/clinic-time.ts.
  return formatClinicTime(date);
}

export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const period = h >= 12 ? "pm" : "am";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(min).padStart(2, "0")} ${period}`;
}

export const SPECIES_LABEL: Record<string, string> = {
  DOG: "Perro",
  CAT: "Gato",
  BIRD: "Ave",
  RABBIT: "Conejo",
  HAMSTER: "Hámster",
  REPTILE: "Reptil",
  OTHER: "Otro",
};

export const SPECIES_EMOJI: Record<string, string> = {
  DOG: "🐶",
  CAT: "🐱",
  BIRD: "🐦",
  RABBIT: "🐰",
  HAMSTER: "🐹",
  REPTILE: "🦎",
  OTHER: "🐾",
};

export const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No se presentó",
};

export const SEX_LABEL: Record<string, string> = {
  MALE: "Macho",
  FEMALE: "Hembra",
  UNKNOWN: "Sin especificar",
};

export const DAY_LABEL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function ageFromBirthDate(birthDate: Date | string | null): string | null {
  if (!birthDate) return null;
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  let months = now.getMonth() - d.getMonth();
  if (now.getDate() < d.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 1) return `${months} ${months === 1 ? "mes" : "meses"}`;
  if (months === 0) return `${years} ${years === 1 ? "año" : "años"}`;
  return `${years} ${years === 1 ? "año" : "años"} ${months}m`;
}

export function dateToInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
