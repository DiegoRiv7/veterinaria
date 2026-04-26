import "server-only";
import { prisma } from "./db";

/**
 * Total unread messages for a vet (messages NOT sent by them, on appointments
 * where they are the assigned vet, with readAt still null).
 */
export async function getVetUnreadCount(vetUserId: string): Promise<number> {
  return prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: vetUserId },
      appointment: { vet: { userId: vetUserId } },
    },
  });
}

/**
 * Total unread messages for a client (sent by anyone other than them, on their
 * appointments).
 */
export async function getClientUnreadCount(clientUserId: string): Promise<number> {
  return prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: clientUserId },
      appointment: { clientId: clientUserId },
    },
  });
}

export type ConversationSummary = {
  clientId: string;
  clientName: string;
  clientPhone: string;
  lastMessage: {
    body: string;
    createdAt: Date;
    fromVet: boolean;
  } | null;
  unreadCount: number;
  totalAppointments: number;
};

/** All conversations for a vet, ordered by most recent activity. */
export async function listVetConversations(vetUserId: string): Promise<ConversationSummary[]> {
  // Distinct clients this vet has had appointments with
  const appts = await prisma.appointment.findMany({
    where: { vet: { userId: vetUserId } },
    select: { clientId: true, client: { select: { id: true, name: true, phone: true } } },
    distinct: ["clientId"],
  });

  const summaries = await Promise.all(
    appts.map(async (a) => {
      const [lastMsg, unread, totalAppts] = await Promise.all([
        prisma.message.findFirst({
          where: {
            appointment: { vet: { userId: vetUserId }, clientId: a.clientId },
          },
          orderBy: { createdAt: "desc" },
          select: { body: true, createdAt: true, senderId: true },
        }),
        prisma.message.count({
          where: {
            readAt: null,
            senderId: { not: vetUserId },
            appointment: { vet: { userId: vetUserId }, clientId: a.clientId },
          },
        }),
        prisma.appointment.count({
          where: { vet: { userId: vetUserId }, clientId: a.clientId },
        }),
      ]);

      return {
        clientId: a.clientId,
        clientName: a.client.name,
        clientPhone: a.client.phone,
        lastMessage: lastMsg
          ? {
              body: lastMsg.body,
              createdAt: lastMsg.createdAt,
              fromVet: lastMsg.senderId === vetUserId,
            }
          : null,
        unreadCount: unread,
        totalAppointments: totalAppts,
      } satisfies ConversationSummary;
    })
  );

  // Sort: unread first, then by latest message timestamp (or appointment recency)
  summaries.sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    const aTime = a.lastMessage?.createdAt.getTime() ?? 0;
    const bTime = b.lastMessage?.createdAt.getTime() ?? 0;
    return bTime - aTime;
  });

  return summaries;
}

/** All messages between a specific vet and client, across all their appointments. */
export async function getVetClientThread(vetUserId: string, clientId: string) {
  return prisma.message.findMany({
    where: {
      appointment: { vet: { userId: vetUserId }, clientId },
    },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Most recent appointment between vet and client (used to attach new messages). */
export async function getMostRecentAppointment(vetUserId: string, clientId: string) {
  return prisma.appointment.findFirst({
    where: { vet: { userId: vetUserId }, clientId },
    orderBy: { scheduledAt: "desc" },
    select: { id: true },
  });
}

/**
 * Map of appointmentId → unread count for messages addressed to the given user
 * (i.e. sent by anyone else and not yet read).
 */
export async function getUnreadByAppointment(
  userId: string,
  appointmentIds: string[]
): Promise<Map<string, number>> {
  if (appointmentIds.length === 0) return new Map();
  const rows = await prisma.message.groupBy({
    by: ["appointmentId"],
    where: {
      appointmentId: { in: appointmentIds },
      readAt: null,
      senderId: { not: userId },
    },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.appointmentId, r._count._all]));
}
