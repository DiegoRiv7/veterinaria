import { redirect } from "next/navigation";
import { Nunito, Space_Grotesk } from "next/font/google";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getVetUnreadCount } from "@/lib/chat";
import { getVetNotifications } from "@/lib/notifications";
import { VetShell } from "@/components/vet/VetShell";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function VetLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const [unread, notifBundle, vetProfile] = await Promise.all([
    getVetUnreadCount(session.userId).catch(() => 0),
    getVetNotifications(session.userId).catch(() => ({
      notifications: [],
      unreadMessages: 0,
      upcomingCount: 0,
      total: 0,
    })),
    prisma.veterinarian
      .findUnique({
        where: { userId: session.userId },
        select: { id: true, photoUrl: true },
      })
      .catch(() => null),
  ]);

  // Citas agendadas alrededor de ahora para el chip "En consulta /
  // Disponible" del topbar (ventana amplia; el cliente evalúa la hora).
  const now = new Date();
  const busyAppts = vetProfile
    ? await prisma.appointment
        .findMany({
          where: {
            vetId: vetProfile.id,
            status: "SCHEDULED",
            scheduledAt: {
              gte: new Date(now.getTime() - 12 * 3600_000),
              lte: new Date(now.getTime() + 24 * 3600_000),
            },
          },
          select: { scheduledAt: true, durationMinutes: true },
        })
        .catch(() => [])
    : [];
  const busyWindows = busyAppts.map((a) => ({
    start: a.scheduledAt.toISOString(),
    end: new Date(
      a.scheduledAt.getTime() + a.durationMinutes * 60_000
    ).toISOString(),
  }));
  const initiallyBusy = busyWindows.some(
    (w) => now >= new Date(w.start) && now < new Date(w.end)
  );

  // Serialize Date objects to strings for the client component
  const notifProps = {
    notifications: notifBundle.notifications.map((n) =>
      n.kind === "message"
        ? { ...n, lastAt: n.lastAt.toISOString() }
        : { ...n, scheduledAt: n.scheduledAt.toISOString() }
    ),
    unreadMessages: notifBundle.unreadMessages,
    upcomingCount: notifBundle.upcomingCount,
    total: notifBundle.total,
  };

  return (
    <div className={`${nunito.variable} ${spaceGrotesk.variable} vet-panel`}>
      <VetShell
        vetName={session.name}
        vetInitials={initials(session.name)}
        vetPhotoUrl={vetProfile?.photoUrl ?? null}
        unreadChat={unread}
        notifications={notifProps}
        busyWindows={busyWindows}
        initiallyBusy={initiallyBusy}
      >
        {children}
      </VetShell>
    </div>
  );
}
