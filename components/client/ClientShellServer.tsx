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

  return (
    <ClientShell
      userName={user.name}
      userPhotoUrl={user.photoUrl}
      unreadNotifs={notifs.unreadCount}
    >
      {children}
    </ClientShell>
  );
}
