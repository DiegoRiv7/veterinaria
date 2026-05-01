import { cn } from "@/lib/utils";
import { MessageInput } from "./MessageInput";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  sender: { name: string; role: string };
};

function formatTimeAgo(d: Date) {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days}d`;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(d);
}

export function AppointmentChat({
  messages,
  currentUserId,
  appointmentId,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  appointmentId: string;
}) {
  return (
    <div className="bg-[var(--color-surface)]/95 backdrop-blur-sm rounded-[18px] border border-[var(--color-border)] shadow-[var(--shadow-soft-sm)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--color-divider)] bg-[var(--color-surface-2)]">
        <p className="text-[15px] font-semibold">Conversación</p>
        <p className="text-[12px] text-[var(--color-muted)]">
          Pregúntale al veterinario sobre la consulta.
        </p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-2.5 max-h-[460px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-6 text-[13px] text-[var(--color-muted)]">
            Aún no hay mensajes. Sé el primero en escribir 👋
          </div>
        ) : (
          messages.map((m) => {
            const own = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col max-w-[75%]",
                  own ? "self-end items-end" : "self-start items-start"
                )}
              >
                {!own && (
                  <span className="text-[11px] text-[var(--color-muted)] mb-0.5 px-2">
                    {m.sender.name}
                    {m.sender.role === "VET" && " · 🩺"}
                  </span>
                )}
                <div
                  className={cn(
                    "px-3.5 py-2 rounded-[16px] text-[14px] leading-snug whitespace-pre-line",
                    own
                      ? "[background-image:var(--chat-bubble-own-bg)] text-[color:var(--chat-bubble-own-text)] rounded-br-[6px]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-foreground)] rounded-bl-[6px]"
                  )}
                >
                  {m.body}
                </div>
                <span className={cn("text-[10px] text-[var(--color-muted)] mt-0.5 px-1", own && "text-right")}>
                  {formatTimeAgo(m.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-[var(--color-divider)] p-3 bg-[var(--color-surface-2)]/40">
        <MessageInput appointmentId={appointmentId} />
      </div>
    </div>
  );
}
