"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  prepareQuery,
  matchCandidate,
  normalizeText,
  digitsOf,
  MIN_SCORE,
} from "@/lib/search-core";
import { SPECIES_LABEL } from "@/lib/utils";
import { clinicDayLabel, formatClinicTimeShort } from "@/lib/clinic-time";

/**
 * Buscador global del panel veterinario (Spotlight). Corre en el
 * servidor: junta candidatos acotados de cada tabla y los califica con
 * el motor tolerante de lib/search-core. Solo personal de la clínica.
 */

export type SearchItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string | null;
  /** true → coincidencia difusa ("¿Buscabas esto?") */
  suggestion?: boolean;
};

export type SearchGroup = { key: string; label: string; items: SearchItem[] };

export type SearchResponse = { groups: SearchGroup[]; total: number };

const SECTIONS: { title: string; href: string; keywords: string }[] = [
  { title: "Dashboard", href: "/vet", keywords: "dashboard inicio panel resumen" },
  { title: "Citas de Hoy", href: "/vet/hoy", keywords: "hoy citas dia agenda" },
  { title: "Calendario", href: "/vet/calendario", keywords: "calendario agenda mes citas agendar" },
  { title: "Pacientes", href: "/vet/pacientes", keywords: "pacientes mascotas listado" },
  { title: "Inventario", href: "/vet/inventario", keywords: "inventario stock productos" },
  { title: "Chat", href: "/vet/chat", keywords: "chat mensajes conversaciones" },
  { title: "Mi Perfil", href: "/vet/perfil", keywords: "perfil cuenta cedula bio" },
];

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

type Scored = SearchItem & { score: number };

function pickTop(items: Scored[], cap: number): SearchItem[] {
  return items
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)
    .map((s) => ({
      id: s.id,
      icon: s.icon,
      title: s.title,
      subtitle: s.subtitle,
      href: s.href,
      badge: s.badge,
      suggestion: s.suggestion,
    }));
}

export async function vetSearchAction(rawQuery: string): Promise<SearchResponse> {
  const session = await requireSession();
  if (session.role === "CLIENT") return { groups: [], total: 0 };

  const raw = (rawQuery ?? "").slice(0, 120);
  const q = prepareQuery(raw);
  if (q.norm.length < 2) return { groups: [], total: 0 };

  const now = new Date();
  const [
    pets,
    clients,
    upcomingAppts,
    pastAppts,
    messages,
    vaccines,
    dewormings,
    surgeries,
    labs,
    tests,
    imagings,
    services,
  ] = await Promise.all([
    prisma.pet.findMany({
      take: 1500,
      select: {
        id: true,
        name: true,
        breed: true,
        species: true,
        color: true,
        microchipId: true,
        owner: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "CLIENT" },
      take: 1500,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        pets: { select: { id: true, name: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      take: 200,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        pet: { select: { name: true } },
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { scheduledAt: { lt: now } },
      orderBy: { scheduledAt: "desc" },
      take: 400,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        pet: { select: { name: true } },
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        body: true,
        createdAt: true,
        appointment: {
          select: {
            clientId: true,
            client: { select: { name: true } },
            pet: { select: { name: true } },
          },
        },
      },
    }),
    prisma.vaccine.findMany({
      orderBy: { appliedAt: "desc" },
      take: 300,
      select: { id: true, name: true, appliedAt: true, petId: true, pet: { select: { name: true } } },
    }),
    prisma.deworming.findMany({
      orderBy: { appliedAt: "desc" },
      take: 300,
      select: { id: true, product: true, appliedAt: true, petId: true, pet: { select: { name: true } } },
    }),
    prisma.surgery.findMany({
      orderBy: { performedAt: "desc" },
      take: 300,
      select: { id: true, name: true, performedAt: true, petId: true, pet: { select: { name: true } } },
    }),
    prisma.labStudy.findMany({
      orderBy: { performedAt: "desc" },
      take: 300,
      select: { id: true, kind: true, performedAt: true, petId: true, pet: { select: { name: true } } },
    }),
    prisma.diagnosticTest.findMany({
      orderBy: { performedAt: "desc" },
      take: 300,
      select: { id: true, name: true, result: true, performedAt: true, petId: true, pet: { select: { name: true } } },
    }),
    prisma.imagingStudy.findMany({
      orderBy: { performedAt: "desc" },
      take: 300,
      select: { id: true, kind: true, region: true, performedAt: true, petId: true, pet: { select: { name: true } } },
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true, basePrice: true, durationMinutes: true },
    }),
  ]);

  const fmtDate = (d: Date) =>
    `${clinicDayLabel(d)} · ${formatClinicTimeShort(d)}`;
  const fmtDay = (d: Date) =>
    new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Mexico_City",
    }).format(d);

  // ── Pacientes ──
  const petItems: Scored[] = [];
  for (const p of pets) {
    const speciesLabel = SPECIES_LABEL[p.species] ?? p.species;
    const m = matchCandidate(q, {
      haystack: normalizeText(
        [p.name, p.breed ?? "", speciesLabel, p.color ?? "", p.microchipId ?? "", p.owner.name].join(" ")
      ),
      digits: digitsOf(p.microchipId ?? ""),
    });
    if (m && m.score >= MIN_SCORE) {
      petItems.push({
        id: `pet-${p.id}`,
        icon: "🐾",
        title: p.name,
        subtitle: `${speciesLabel}${p.breed ? ` · ${p.breed}` : ""} · ${p.owner.name}`,
        href: `/vet/pacientes/${p.id}`,
        score: m.score + 8,
        suggestion: m.fuzzyOnly,
      });
    }
  }

  // ── Clientes ──
  const clientItems: Scored[] = [];
  for (const c of clients) {
    const m = matchCandidate(q, {
      haystack: normalizeText(
        [c.name, c.email, c.phone ?? "", ...c.pets.map((p) => p.name)].join(" ")
      ),
      digits: digitsOf(c.phone ?? ""),
    });
    if (m && m.score >= MIN_SCORE) {
      clientItems.push({
        id: `client-${c.id}`,
        icon: "👤",
        title: c.name,
        subtitle: `${c.phone ?? "sin teléfono"} · ${c.pets.length} ${c.pets.length === 1 ? "mascota" : "mascotas"}`,
        href: `/vet/chat/${c.id}`,
        badge: "abrir chat",
        score: m.score + 5,
        suggestion: m.fuzzyOnly,
      });
    }
  }

  // ── Citas ──
  const apptItems: Scored[] = [];
  for (const a of [...upcomingAppts, ...pastAppts]) {
    const m = matchCandidate(q, {
      haystack: normalizeText(
        [a.pet.name, a.client.name, a.service.name, STATUS_LABEL[a.status] ?? ""].join(" ")
      ),
    });
    if (m && m.score >= MIN_SCORE) {
      const future = a.scheduledAt >= now;
      apptItems.push({
        id: `appt-${a.id}`,
        icon: "📅",
        title: `${a.pet.name} · ${a.service.name}`,
        subtitle: `${fmtDate(a.scheduledAt)} · ${a.client.name}`,
        href: `/vet/cita/${a.id}`,
        badge: STATUS_LABEL[a.status] ?? null,
        score: m.score + (future ? 10 : 0),
        suggestion: m.fuzzyOnly,
      });
    }
  }

  // ── Chats (contenido de mensajes) — un resultado por conversación ──
  const chatItems: Scored[] = [];
  const seenThreads = new Set<string>();
  for (const msg of messages) {
    const clientId = msg.appointment.clientId;
    if (seenThreads.has(clientId)) continue;
    const m = matchCandidate(q, {
      haystack: normalizeText(
        [msg.body, msg.appointment.client.name, msg.appointment.pet.name].join(" ")
      ),
    });
    if (m && m.score >= MIN_SCORE) {
      seenThreads.add(clientId);
      const snippet =
        msg.body.length > 64 ? `${msg.body.slice(0, 64)}…` : msg.body;
      chatItems.push({
        id: `chat-${msg.id}`,
        icon: "💬",
        title: `Chat con ${msg.appointment.client.name}`,
        subtitle: `“${snippet}”`,
        href: `/vet/chat/${clientId}`,
        score: m.score,
        suggestion: m.fuzzyOnly,
      });
    }
  }

  // ── Expediente (registros médicos) ──
  const recordItems: Scored[] = [];
  const pushRecord = (
    key: string,
    icon: string,
    label: string,
    name: string,
    petId: string,
    petName: string,
    when: Date,
    extra = ""
  ) => {
    const m = matchCandidate(q, {
      haystack: normalizeText([name, extra, petName, label].join(" ")),
    });
    if (m && m.score >= MIN_SCORE) {
      recordItems.push({
        id: key,
        icon,
        title: `${name} — ${petName}`,
        subtitle: `${label} · ${fmtDay(when)}`,
        href: `/vet/pacientes/${petId}/cartilla`,
        score: m.score,
        suggestion: m.fuzzyOnly,
      });
    }
  };
  for (const v of vaccines) pushRecord(`vac-${v.id}`, "💉", "Vacuna", v.name, v.petId, v.pet.name, v.appliedAt);
  for (const d of dewormings) pushRecord(`dew-${d.id}`, "💊", "Desparasitación", d.product, d.petId, d.pet.name, d.appliedAt);
  for (const s of surgeries) pushRecord(`sur-${s.id}`, "🔪", "Cirugía", s.name, s.petId, s.pet.name, s.performedAt);
  for (const l of labs) pushRecord(`lab-${l.id}`, "🔬", "Laboratorio", l.kind, l.petId, l.pet.name, l.performedAt);
  for (const t of tests) pushRecord(`tst-${t.id}`, "🧪", "Test", t.name, t.petId, t.pet.name, t.performedAt, t.result ?? "");
  for (const i of imagings) pushRecord(`img-${i.id}`, "🩻", "Imagenología", i.kind, i.petId, i.pet.name, i.performedAt, i.region ?? "");

  // ── Servicios ──
  const serviceItems: Scored[] = [];
  for (const s of services) {
    const m = matchCandidate(q, { haystack: normalizeText(s.name) });
    if (m && m.score >= MIN_SCORE) {
      serviceItems.push({
        id: `svc-${s.id}`,
        icon: "🧰",
        title: s.name,
        subtitle: `Servicio · $${s.basePrice} · ${s.durationMinutes} min`,
        href: "/vet/calendario",
        badge: "agendar",
        score: m.score,
        suggestion: m.fuzzyOnly,
      });
    }
  }

  // ── Secciones ──
  const sectionItems: Scored[] = [];
  for (const sec of SECTIONS) {
    const m = matchCandidate(q, {
      haystack: normalizeText(`${sec.title} ${sec.keywords}`),
    });
    if (m && m.score >= MIN_SCORE) {
      sectionItems.push({
        id: `sec-${sec.href}`,
        icon: "🧭",
        title: sec.title,
        subtitle: "Ir a la sección",
        href: sec.href,
        score: m.score - 5,
        suggestion: m.fuzzyOnly,
      });
    }
  }

  const groups: SearchGroup[] = [
    { key: "pets", label: "Pacientes", items: pickTop(petItems, 6) },
    { key: "clients", label: "Clientes", items: pickTop(clientItems, 5) },
    { key: "appts", label: "Citas", items: pickTop(apptItems, 6) },
    { key: "chats", label: "Chats", items: pickTop(chatItems, 4) },
    { key: "records", label: "Expediente", items: pickTop(recordItems, 6) },
    { key: "services", label: "Servicios", items: pickTop(serviceItems, 4) },
    { key: "sections", label: "Secciones", items: pickTop(sectionItems, 4) },
  ].filter((g) => g.items.length > 0);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return { groups, total };
}

/* ─── Sugerencias inteligentes (panel sin búsqueda) ─────────────── */

function relativeBadge(d: Date, now: Date): string {
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60000);
  if (diffMin >= 0) {
    if (diffMin < 1) return "ahora";
    if (diffMin < 60) return `en ${diffMin} min`;
    if (diffMin < 360) return `en ${Math.round(diffMin / 60)} h`;
    return `${clinicDayLabel(d)} ${formatClinicTimeShort(d)}`;
  }
  const ago = -diffMin;
  if (ago < 60) return `hace ${ago} min`;
  if (ago < 1440) return `hace ${Math.round(ago / 60)} h`;
  return clinicDayLabel(d);
}

/**
 * Lista inteligente para el panel de búsqueda vacío: citas que están por
 * suceder (las más cercanas primero), citas recién atendidas, y el
 * cliente mezcla encima lo que el usuario buscó hace poco.
 */
export async function vetSearchSuggestionsAction(): Promise<SearchItem[]> {
  const session = await requireSession();
  if (session.role === "CLIENT") return [];

  const now = new Date();
  const vetProfile = await prisma.veterinarian.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  const apptSelect = {
    id: true,
    scheduledAt: true,
    updatedAt: true,
    status: true,
    pet: { select: { name: true } },
    client: { select: { name: true } },
    service: { select: { name: true } },
  } as const;

  async function fetchWindows(vetFilter: { vetId?: string }) {
    return Promise.all([
      prisma.appointment.findMany({
        where: {
          ...vetFilter,
          status: "SCHEDULED",
          scheduledAt: { gte: new Date(now.getTime() - 20 * 60000) },
        },
        orderBy: { scheduledAt: "asc" },
        take: 4,
        select: apptSelect,
      }),
      prisma.appointment.findMany({
        where: {
          ...vetFilter,
          status: "COMPLETED",
          updatedAt: { gte: new Date(now.getTime() - 48 * 3600_000) },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: apptSelect,
      }),
    ]);
  }

  // Primero las del médico; si no tiene, las de toda la clínica.
  let [upcoming, justClosed] = await fetchWindows(
    vetProfile ? { vetId: vetProfile.id } : {}
  );
  if (upcoming.length === 0 && justClosed.length === 0 && vetProfile) {
    [upcoming, justClosed] = await fetchWindows({});
  }

  const items: SearchItem[] = [];
  for (const a of upcoming) {
    items.push({
      id: `sug-up-${a.id}`,
      icon: "📅",
      title: `${a.pet.name} · ${a.service.name}`,
      subtitle: `Próxima cita · ${formatClinicTimeShort(a.scheduledAt)} · ${a.client.name}`,
      href: `/vet/cita/${a.id}`,
      badge: relativeBadge(a.scheduledAt, now),
    });
  }
  for (const a of justClosed) {
    items.push({
      id: `sug-done-${a.id}`,
      icon: "✅",
      title: `${a.pet.name} · ${a.service.name}`,
      subtitle: `Recién atendida · ${a.client.name}`,
      href: `/vet/cita/${a.id}`,
      badge: `atendida ${relativeBadge(a.updatedAt, now)}`,
    });
  }

  // Último respaldo: actividad reciente de la clínica (cualquier cita y
  // pacientes nuevos), para que el panel nunca abra vacío.
  if (items.length === 0) {
    const [recentAppts, recentPets] = await Promise.all([
      prisma.appointment.findMany({
        orderBy: { updatedAt: "desc" },
        take: 4,
        select: apptSelect,
      }),
      prisma.pet.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          name: true,
          species: true,
          breed: true,
          owner: { select: { name: true } },
        },
      }),
    ]);
    for (const a of recentAppts) {
      items.push({
        id: `sug-act-${a.id}`,
        icon: "📅",
        title: `${a.pet.name} · ${a.service.name}`,
        subtitle: `${STATUS_LABEL[a.status] ?? a.status} · ${a.client.name}`,
        href: `/vet/cita/${a.id}`,
        badge: relativeBadge(a.scheduledAt, now),
      });
    }
    for (const p of recentPets) {
      items.push({
        id: `sug-pet-${p.id}`,
        icon: "🐾",
        title: p.name,
        subtitle: `Paciente reciente · ${SPECIES_LABEL[p.species] ?? p.species}${p.breed ? ` · ${p.breed}` : ""} · ${p.owner.name}`,
        href: `/vet/pacientes/${p.id}`,
      });
    }
  }

  return items.slice(0, 7);
}

