import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  sender: { id: string; name: string; role: string };
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayHeader(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  if (target.getTime() === today.getTime()) return "Hoy";
  if (target.getTime() === yesterday.getTime()) return "Ayer";
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

function formatTimeOnly(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hour12: true }).format(d);
}

export function ChatThreadView({
  messages,
  currentUserId,
}: {
  messages: Msg[];
  currentUserId: string;
}) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-[14px] text-[var(--color-muted)]">
        Aún no hay mensajes. Empieza la conversación 👋
      </div>
    );
  }

  // Insert day separators
  const items: Array<{ kind: "day"; key: string; date: Date } | { kind: "msg"; key: string; m: Msg }> = [];
  let lastDay = "";
  for (const m of messages) {
    const key = dayKey(m.createdAt);
    if (key !== lastDay) {
      items.push({ kind: "day", key: `d-${key}`, date: m.createdAt });
      lastDay = key;
    }
    items.push({ kind: "msg", key: m.id, m });
  }

  return (
    <div className="flex flex-col gap-2 pb-4">
      {items.map((it) =>
        it.kind === "day" ? (
          <div key={it.key} className="flex justify-center my-3">
            <span className="text-[11px] uppercase tracking-wider text-[var(--color-muted)] bg-[var(--color-surface-2)]/80 backdrop-blur px-3 py-1 rounded-full">
              {formatDayHeader(it.date)}
            </span>
          </div>
        ) : (
          <Bubble key={it.key} m={it.m} own={it.m.senderId === currentUserId} />
        )
      )}
    </div>
  );
}

function Bubble({ m, own }: { m: Msg; own: boolean }) {
  return (
    <div className={cn("flex flex-col max-w-[78%]", own ? "self-end items-end" : "self-start items-start")}>
      <div
        className={cn(
          "px-3.5 py-2 rounded-[18px] text-[14px] leading-snug whitespace-pre-line shadow-[var(--shadow-soft-sm)]",
          own
            ? "[background-image:var(--chat-bubble-own-bg)] text-[color:var(--chat-bubble-own-text)] rounded-br-[6px]"
            : "bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-bl-[6px]"
        )}
      >
        {m.body}
      </div>
      <span className={cn("text-[10px] text-[var(--color-muted)] mt-0.5 px-1", own && "text-right")}>
        {formatTimeOnly(m.createdAt)}
      </span>
    </div>
  );
}
