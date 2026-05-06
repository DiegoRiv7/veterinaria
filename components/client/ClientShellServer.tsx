import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientNotifications } from "@/lib/client-notifications";
import { ClientShell } from "./ClientShell";

export async function ClientShellServer({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");

  const [user, notifs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, photoUrl: true },
    }),
    getClientNotifications(session.userId),
  ]);

  if (!user) redirect("/login");

  const notifPreviews = notifs.notifications.slice(0, 8).map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    icon: n.icon,
    href: n.href,
    at: n.at.toISOString(),
  }));

  return (
    <ClientShell
      userName={user.name}
      userPhotoUrl={user.photoUrl}
      unreadNotifs={notifs.unreadCount}
      notifPreviews={notifPreviews}
    >
      {children}
    </ClientShell>
  );
}
