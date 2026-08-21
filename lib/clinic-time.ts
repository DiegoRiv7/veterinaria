/**
 * Hora oficial de la clínica.
 *
 * Todas las horas de citas se guardan y se muestran en esta zona horaria,
 * sin importar dónde corra el servidor (Vercel usa UTC) ni la zona del
 * dispositivo del usuario. Así, una cita capturada a las 11:00 p.m. se ve
 * a las 11:00 p.m. en el calendario, en "Citas de Hoy", en notificaciones
 * y en la app del cliente por igual.
 *
 * Este módulo es isomorfo (se usa en componentes de cliente y servidor):
 * no debe importar nada de "server-only".
 */

export const CLINIC_TIME_ZONE = "America/Mexico_City";

const HM_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: CLINIC_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Hora y minuto de un instante, según el reloj de la clínica. */
export function clinicHourMinute(date: Date | string): { h: number; m: number } {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return { h: NaN, m: NaN };
  const parts = HM_FORMAT.formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? NaN);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? NaN);
  return { h, m };
}

/** "23:05" — 24 horas, reloj de la clínica. */
export function formatClinicTimeShort(date: Date | string): string {
  const { h, m } = clinicHourMinute(date);
  if (Number.isNaN(h)) return "—";
  return `${h}:${String(m).padStart(2, "0")}`;
}

/**
 * "11:05 p.m." — AM/PM calculado a mano en lugar de hour12 de Intl:
 * iOS Safari (versiones viejas) puede marcar todas las horas como "a.m."
 * bajo es-MX.
 */
export function formatClinicTime(date: Date | string): string {
  const { h, m } = clinicHourMinute(date);
  if (Number.isNaN(h)) return "—";
  const period = h >= 12 ? "p.m." : "a.m.";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

const YMD_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLINIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" del instante según el calendario de la clínica (para <input type="date">). */
export function clinicDateInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return YMD_FORMAT.format(d);
}

/** "HH:MM" (24 h, con cero inicial) según el reloj de la clínica (para <input type="time">). */
export function clinicTimeInput(date: Date | string): string {
  const { h, m } = clinicHourMinute(date);
  if (Number.isNaN(h)) return "";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const OFFSET_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: CLINIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Diferencia (ms) entre el reloj de la clínica y UTC en un instante dado. */
function clinicOffsetMs(at: Date): number {
  const parts = OFFSET_FORMAT.formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUTC - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * Convierte "YYYY-MM-DD" + "HH:MM" (hora de pared de la clínica) al
 * instante real. Devuelve Invalid Date si el formato no cuadra, para que
 * el caller valide con Number.isNaN(d.getTime()) como siempre.
 */
export function clinicInstant(dateStr: string, timeStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return new Date(NaN);
  }
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const wallAsUTC = Date.UTC(y, mo - 1, d, h, mi);
  // Dos pasadas por si el instante cae junto a un cambio de horario.
  let ts = wallAsUTC - clinicOffsetMs(new Date(wallAsUTC));
  ts = wallAsUTC - clinicOffsetMs(new Date(ts));
  return new Date(ts);
}

/**
 * Etiqueta corta del día de una fecha en el reloj de la clínica:
 * "hoy" | "mañana" | "22 ago". Útil para listas de próximas citas.
 */
export function clinicDayLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = clinicDateInput(d);
  if (day === clinicDateInput(new Date())) return "hoy";
  if (day === clinicDateInput(new Date(Date.now() + 86400000))) return "mañana";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: CLINIC_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(d);
}
