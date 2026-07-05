import { cn } from "@/lib/utils";
import { MessageInput } from "./MessageInput";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  sender: { name: string; role: string; photoUrl?: string | null };
  vetPhotoUrl?: string | null;
};

function avatarInitial(name: string): string {
  const honorific = /^Dr[a]?\.?\s*/i;
  const cleaned = name.replace(honorific, "").trim();
  return (cleaned.charAt(0) || name.charAt(0) || "?").toUpperCase();
}

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
  embedded = false,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  appointmentId: string;
  /** Sin marco ni encabezado propio — para usarlo dentro de una ventana
   *  que ya trae su propio chrome (p.ej. AppointmentChatWidget). */
  embedded?: boolean;
}) {
  return (
    <div
      className={
        embedded
          ? "flex h-full min-h-0 flex-1 flex-col bg-[var(--color-surface)]"
          : "bg-[var(--color-surface)]/95 backdrop-blur-sm rounded-[18px] border border-[var(--color-border)] shadow-[var(--shadow-soft-sm)] overflow-hidden"
      }
    >
      {!embedded && (
        <div className="px-5 py-3 border-b border-[var(--color-divider)] bg-[var(--color-surface-2)]">
          <p className="text-[15px] font-semibold">Conversación</p>
          <p className="text-[12px] text-[var(--color-muted)]">
            Pregúntale al veterinario sobre la consulta.
          </p>
        </div>
      )}

      <div
        className={cn(
          "px-4 py-4 flex flex-col gap-2.5 overflow-y-auto",
          embedded ? "flex-1 min-h-0" : "max-h-[460px]"
        )}
      >
        {messages.length === 0 ? (
          <div className="text-center py-6 text-[13px] text-[var(--color-muted)]">
            Aún no hay mensajes. Sé el primero en escribir 👋
          </div>
        ) : (
          messages.map((m) => {
            const own = m.senderId === currentUserId;
            const photo =
              m.sender.role === "VET"
                ? m.vetPhotoUrl ?? m.sender.photoUrl ?? null
                : m.sender.photoUrl ?? null;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2 max-w-[78%]",
                  own ? "self-end flex-row-reverse" : "self-start"
                )}
              >
                {!own && (
                  <div
                    className="rounded-full overflow-hidden flex items-center justify-center text-[12px] font-extrabold text-white shrink-0"
                    style={{
                      width: 30,
                      height: 30,
                      background: photo
                        ? "var(--color-surface-2)"
                        : m.sender.role === "VET"
                        ? "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 60%, oklch(45% 0.12 38)))"
                        : "linear-gradient(135deg, var(--color-brand) 60%, oklch(60% 0.10 60))",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={m.sender.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{avatarInitial(m.sender.name)}</span>
                    )}
                  </div>
                )}
                <div className={cn("flex flex-col", own ? "items-end" : "items-start")}>
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
