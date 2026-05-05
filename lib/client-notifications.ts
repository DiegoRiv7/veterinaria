import "server-only";
import { prisma } from "./db";

export type ClientNotification =
  | {
      kind: "message";
      id: string;
      title: string;
      body: string;
      icon: string;
      at: Date;
      href: string;
      read: boolean;
    }
  | {
      kind: "appointment";
      id: string;
      title: string;
      body: string;
      icon: string;
      at: Date;
      href: string;
      read: boolean;
    }
  | {
      kind: "birthday";
      id: string;
      title: string;
      body: string;
      icon: string;
      at: Date;
      href: string;
      read: boolean;
    };

export type ClientNotificationsBundle = {
  notifications: ClientNotification[];
  unreadCount: number;
};

const TWO_DAYS_MS = 48 * 60 * 60 * 1000;
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

export async function getClientNotifications(
  clientUserId: string
): Promise<ClientNotificationsBundle> {
  const now = new Date();
  const upcomingWindow = new Date(now.getTime() + TWO_DAYS_MS);

  const [unreadMessages, upcoming, pets] = await Promise.all([
    prisma.message.findMany({
      where: {
        readAt: null,
        senderId: { not: clientUserId },
        appointment: { clientId: clientUserId },
      },
      include: {
        sender: { select: { name: true } },
        appointment: { select: { id: true, pet: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.appointment.findMany({
      where: {
        clientId: clientUserId,
        status: "SCHEDULED",
        scheduledAt: { gte: now, lte: upcomingWindow },
      },
      include: {
        pet: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.pet.findMany({
      where: { ownerId: clientUserId, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    }),
  ]);

  const out: ClientNotification[] = [];

  for (const m of unreadMessages) {
    out.push({
      kind: "message",
      id: `msg-${m.id}`,
      title: `Mensaje del veterinario`,
      body: `${m.sender.name.split(" ")[0]} sobre ${m.appointment.pet.name}: ${m.body.slice(0, 80)}${m.body.length > 80 ? "…" : ""}`,
      icon: "💬",
      at: m.createdAt,
      href: `/cita/${m.appointment.id}`,
      read: false,
    });
  }

  for (const a of upcoming) {
    const hours = Math.round((a.scheduledAt.getTime() - now.getTime()) / 3600000);
    const when = hours <= 0 ? "ahora mismo" : hours < 24 ? `en ${hours}h` : "mañana";
    out.push({
      kind: "appointment",
      id: `appt-${a.id}`,
      title: "Cita próxima",
      body: `${a.service.name} para ${a.pet.name} ${when}`,
      icon: "📅",
      at: a.scheduledAt,
      href: `/cita/${a.id}`,
      read: false,
    });
  }

  for (const p of pets) {
    if (!p.birthDate) continue;
    const bd = new Date(p.birthDate);
    const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
    if (next.getTime() < now.getTime()) {
      next.setFullYear(now.getFullYear() + 1);
    }
    const diff = next.getTime() - now.getTime();
    if (diff > 0 && diff <= TEN_DAYS_MS) {
      const days = Math.ceil(diff / 86400000);
      out.push({
        kind: "birthday",
        id: `bday-${p.id}`,
        title: `Cumpleaños de ${p.name}`,
        body:
          days === 0
            ? `¡Hoy es el cumpleaños de ${p.name}! 🎂`
            : `${p.name} cumple años en ${days} día${days === 1 ? "" : "s"}`,
        icon: "🎂",
        at: next,
        href: `/mascotas/${p.id}`,
        read: false,
      });
    }
  }

  out.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    notifications: out,
    unreadCount: out.length,
  };
}
