import "server-only";
import { prisma } from "./db";

export type VetNotification =
  | {
      kind: "message";
      id: string; // = clientId for grouping
      clientId: string;
      clientName: string;
      preview: string;
      count: number;
      lastAt: Date;
    }
  | {
      kind: "upcoming";
      id: string;
      petName: string;
      clientName: string;
      serviceName: string;
      scheduledAt: Date;
    };

export type VetNotificationsBundle = {
  notifications: VetNotification[];
  unreadMessages: number;
  upcomingCount: number;
  /** Total to show on the bell badge (messages + upcoming) */
  total: number;
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfNextDay(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

export async function getVetNotifications(
  vetUserId: string
): Promise<VetNotificationsBundle> {
  // Unread messages: not from this vet, on appointments where this vet is assigned
  const unread = await prisma.message.findMany({
    where: {
      readAt: null,
      senderId: { not: vetUserId },
      appointment: { vet: { userId: vetUserId } },
    },
    include: {
      appointment: { select: { clientId: true, client: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const messageNotifs = new Map<string, Extract<VetNotification, { kind: "message" }>>();
  for (const m of unread) {
    const clientId = m.appointment.clientId;
    const existing = messageNotifs.get(clientId);
    if (existing) {
      existing.count++;
    } else {
      messageNotifs.set(clientId, {
        kind: "message",
        id: clientId,
        clientId,
        clientName: m.appointment.client.name,
        preview: m.body.length > 80 ? `${m.body.slice(0, 77)}…` : m.body,
        count: 1,
        lastAt: m.createdAt,
      });
    }
  }

  // Upcoming today's appointments — the next 6 hours of SCHEDULED ones
  const sixHoursFromNow = new Date(Date.now() + 6 * 3600 * 1000);
  const todayEnd = startOfNextDay();
  const horizon = sixHoursFromNow < todayEnd ? sixHoursFromNow : todayEnd;

  let upcoming: Awaited<ReturnType<typeof prisma.appointment.findMany>> = [];
  // Find the vet profile id for the user (avoid an extra round trip if possible)
  const vet = await prisma.veterinarian.findUnique({
    where: { userId: vetUserId },
    select: { id: true },
  });
  if (vet) {
    upcoming = await prisma.appointment.findMany({
      where: {
        vetId: vet.id,
        status: "SCHEDULED",
        scheduledAt: { gte: new Date(), lt: horizon },
      },
      include: {
        pet: { select: { name: true } },
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    });
  }

  const upcomingNotifs: VetNotification[] = upcoming.map((a) => ({
    kind: "upcoming" as const,
    id: a.id,
    petName: (a as unknown as { pet: { name: string } }).pet.name,
    clientName: (a as unknown as { client: { name: string } }).client.name,
    serviceName: (a as unknown as { service: { name: string } }).service.name,
    scheduledAt: a.scheduledAt,
  }));

  const messageList = [...messageNotifs.values()].sort(
    (a, b) => b.lastAt.getTime() - a.lastAt.getTime()
  );

  return {
    notifications: [...messageList, ...upcomingNotifs],
    unreadMessages: unread.length,
    upcomingCount: upcomingNotifs.length,
    total: unread.length + upcomingNotifs.length,
  };
}
