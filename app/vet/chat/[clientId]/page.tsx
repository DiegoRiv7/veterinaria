import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { getMostRecentAppointment, getVetClientThread } from "@/lib/chat";
import { ChatThreadView } from "@/components/ChatThreadView";
import { VetMessageInput } from "@/components/VetMessageInput";
import { ChevronLeft } from "lucide-react";
import { clinicDayLabel } from "@/lib/clinic-time";

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

  // Contexto por cita para los separadores del hilo
  const appointmentInfo: Record<string, { label: string; href: string }> = {};
  for (const m of messages) {
    if (!appointmentInfo[m.appointment.id]) {
      appointmentInfo[m.appointment.id] = {
        label: `${m.appointment.service.name} · ${m.appointment.pet.name} · ${clinicDayLabel(m.appointment.scheduledAt)}`,
        href: `/vet/cita/${m.appointment.id}`,
      };
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-32">
      <Link
        href="/vet/chat"
        className="text-sm font-semibold inline-flex items-center gap-1 no-underline"
        style={{ color: "var(--vet-green)" }}
      >
        <ChevronLeft className="h-4 w-4" /> Conversaciones
      </Link>

      <header
        className="flex items-center gap-3 pb-4 border-b"
        style={{ borderBottomColor: "var(--vet-border)" }}
      >
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center text-[15px] font-extrabold text-white"
          style={{ background: "linear-gradient(135deg, var(--vet-blue), oklch(38% 0.18 280))" }}
        >
          {initials(client.name)}
        </div>
        <div className="min-w-0">
          <h1
            className="text-[20px] font-extrabold tracking-tight truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            {client.name}
          </h1>
          <p className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
            {client.phone}
          </p>
        </div>
        {/* Contexto: cita más reciente de esta conversación */}
        <Link
          href={`/vet/cita/${recent.id}`}
          className="ml-auto hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-full border text-[12px] font-extrabold no-underline transition hover:brightness-95 shrink-0"
          style={{
            background: "color-mix(in oklab, var(--vet-green) 10%, transparent)",
            borderColor: "color-mix(in oklab, var(--vet-green) 28%, var(--vet-border))",
            color: "var(--vet-green-dim)",
          }}
        >
          📅 {recent.service.name} · {recent.pet.name} ·{" "}
          {clinicDayLabel(recent.scheduledAt)} →
        </Link>
      </header>

      <ChatThreadView
        messages={messages}
        currentUserId={session.userId}
        appointmentInfo={appointmentInfo}
      />

      <div className="fixed bottom-3 inset-x-0 z-30 px-4 lg:left-[220px]">
        <div className="mx-auto max-w-[720px]">
          <div
            className="backdrop-blur-xl border p-3 rounded-[18px]"
            style={{
              background: "color-mix(in oklab, var(--vet-bg-card) 92%, transparent)",
              borderColor: "var(--vet-border)",
            }}
          >
            <VetMessageInput appointmentId={recent.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
