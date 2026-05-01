import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { listVetConversations } from "@/lib/chat";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

function formatRelative(d: Date | null) {
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(d);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => !/^(dr\.?|dra\.?)$/i.test(p));
  if (parts.length === 0) return "?";
  return parts[0][0]?.toUpperCase() ?? "?";
}

export default async function VetChatList() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const conversations = await listVetConversations(session.userId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-black tracking-tight" style={{ color: "var(--vet-text-1)" }}>
          Conversaciones
        </h2>
        <div className="text-[13px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
          Tus clientes y sus mensajes
        </div>
      </div>

      <div>
        {conversations.length === 0 ? (
          <EmptyState
            emoji="💬"
            title="Aún no hay mensajes"
            description="Cuando atiendas tu primera cita podrás conversar con el dueño aquí."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map((c) => {
              const isUnread = c.unreadCount > 0;
              const preview = c.lastMessage
                ? `${c.lastMessage.fromVet ? "Tú: " : ""}${c.lastMessage.body}`
                : "Sin mensajes todavía. Saluda 👋";
              return (
                <Link key={c.clientId} href={`/vet/chat/${c.clientId}`}>
                  <Card className="hover:border-[var(--color-brand)]/30 hover:shadow-[var(--shadow-soft-md)] transition">
                    <CardBody className="flex items-center gap-3 py-3.5">
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-[15px] font-extrabold text-white shadow-[var(--shadow-soft-sm)]"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--vet-blue), oklch(38% 0.18 280))",
                        }}
                      >
                        {initials(c.clientName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`truncate ${isUnread ? "font-semibold" : "font-medium"}`}>
                            {c.clientName}
                          </p>
                          <span className="text-[11px] text-[var(--color-muted)] shrink-0">
                            {formatRelative(c.lastMessage?.createdAt ?? null)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className={`text-[13px] truncate ${
                              isUnread
                                ? "text-[var(--color-foreground)]"
                                : "text-[var(--color-muted)]"
                            }`}
                          >
                            {preview}
                          </p>
                          {isUnread ? (
                            <span className="shrink-0 h-[20px] min-w-[20px] rounded-full bg-[#ef4444] text-white text-[11px] leading-none font-semibold px-1.5 flex items-center justify-center">
                              {c.unreadCount > 99 ? "99+" : c.unreadCount}
                            </span>
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[var(--color-muted-2)] shrink-0" />
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
