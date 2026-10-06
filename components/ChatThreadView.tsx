import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatClinicTime } from "@/lib/clinic-time";
import { ChatAttachment } from "./ChatAttachment";

type Msg = {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  sender: { id: string; name: string; role: string };
  appointmentId?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
};

/** Contexto por cita: etiqueta y enlace para el separador del hilo. */
export type ApptInfo = Record<string, { label: string; href: string }>;

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
  // Siempre en hora de la clínica — ver lib/clinic-time.ts.
  return formatClinicTime(d);
}

export function ChatThreadView({
  messages,
  currentUserId,
  appointmentInfo,
}: {
  messages: Msg[];
  currentUserId: string;
  /** Si se pasa, el hilo inserta separadores con la cita de cada tramo. */
  appointmentInfo?: ApptInfo;
}) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-[14px] text-[var(--color-muted)]">
        Aún no hay mensajes. Empieza la conversación 👋
      </div>
    );
  }

  // Insert day + appointment separators
  const items: Array<
    | { kind: "day"; key: string; date: Date }
    | { kind: "appt"; key: string; label: string; href: string }
    | { kind: "msg"; key: string; m: Msg }
  > = [];
  let lastDay = "";
  let lastAppt = "";
  for (const m of messages) {
    const key = dayKey(m.createdAt);
    if (key !== lastDay) {
      items.push({ kind: "day", key: `d-${key}`, date: m.createdAt });
      lastDay = key;
    }
    if (appointmentInfo && m.appointmentId && m.appointmentId !== lastAppt) {
      const info = appointmentInfo[m.appointmentId];
      if (info) {
        items.push({
          kind: "appt",
          key: `a-${m.appointmentId}-${m.id}`,
          label: info.label,
          href: info.href,
        });
      }
      lastAppt = m.appointmentId;
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
        ) : it.kind === "appt" ? (
          <div key={it.key} className="flex justify-center my-1.5">
            <Link
              href={it.href}
              className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full border no-underline transition hover:brightness-95"
              style={{
                background: "color-mix(in oklab, var(--color-brand) 8%, var(--color-surface))",
                borderColor: "color-mix(in oklab, var(--color-brand) 26%, var(--color-border))",
                color: "var(--color-brand)",
              }}
            >
              📅 {it.label} →
            </Link>
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
          "px-3.5 py-2 rounded-[18px] text-[14px] leading-snug whitespace-pre-line shadow-[var(--shadow-soft-sm)] flex flex-col gap-2",
          own
            ? "[background-image:var(--chat-bubble-own-bg)] text-[color:var(--chat-bubble-own-text)] rounded-br-[6px]"
            : "bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-bl-[6px]"
        )}
      >
        {m.attachmentUrl && (
          <ChatAttachment
            url={m.attachmentUrl}
            name={m.attachmentName ?? null}
            type={m.attachmentType ?? null}
            own={own}
          />
        )}
        {m.body ? <span>{m.body}</span> : null}
      </div>
      <span className={cn("text-[10px] text-[var(--color-muted)] mt-0.5 px-1", own && "text-right")}>
        {formatTimeOnly(m.createdAt)}
      </span>
    </div>
  );
}
