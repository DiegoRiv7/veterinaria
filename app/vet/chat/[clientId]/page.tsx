import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { getMostRecentAppointment, getVetClientThread } from "@/lib/chat";
import { AppShell, PageContainer } from "@/components/ui/page";
import { VetTabBar } from "@/components/VetTabBar";
import { ChatThreadView } from "@/components/ChatThreadView";
import { VetMessageInput } from "@/components/VetMessageInput";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  return parts[0][0]?.toUpperCase() ?? "?";
}

export default async function VetChatThreadPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const [client, recent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, phone: true, role: true },
    }),
    getMostRecentAppointment(session.userId, clientId),
  ]);
  if (!client || client.role !== "CLIENT" || !recent) notFound();

  // Mark all messages from this client to this vet as read
  await prisma.message.updateMany({
    where: {
      readAt: null,
      senderId: { not: session.userId },
      appointment: { vet: { userId: session.userId }, clientId },
    },
    data: { readAt: new Date() },
  });

  const messages = await getVetClientThread(session.userId, clientId);

  return (
    <AppShell>
      <PageContainer className="pb-40">
        <Link
          href="/vet/chat"
          className="text-sm text-[var(--color-brand)] mb-3 inline-flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Conversaciones
        </Link>

        <header className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--color-border)]">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#dbeafe] via-[#ede9fe] to-[#fce7f3] flex items-center justify-center text-[15px] font-semibold text-[#4f46e5] shadow-[var(--shadow-soft-sm)]">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold tracking-tight truncate">{client.name}</h1>
            <p className="text-[12px] text-[var(--color-muted)]">{client.phone}</p>
          </div>
        </header>

        <ChatThreadView messages={messages} currentUserId={session.userId} />

        <div className="fixed bottom-[88px] inset-x-0 z-30 px-4 pb-2">
          <div className="mx-auto max-w-[720px]">
            <div className="bg-[var(--color-surface)]/95 backdrop-blur-xl border border-[var(--color-border)] rounded-[18px] shadow-[var(--shadow-soft-lg)] p-3">
              <VetMessageInput appointmentId={recent.id} />
            </div>
          </div>
        </div>
      </PageContainer>
      <VetTabBar />
    </AppShell>
  );
}
