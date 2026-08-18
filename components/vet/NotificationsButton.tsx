"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VetIcon } from "./VetIcon";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import { CLINIC_TIME_ZONE, formatClinicTime } from "@/lib/clinic-time";

type Notif =
  | {
      kind: "message";
      id: string;
      clientId: string;
      clientName: string;
      preview: string;
      count: number;
      lastAt: string;
    }
  | {
      kind: "upcoming";
      id: string;
      petName: string;
      clientName: string;
      serviceName: string;
      scheduledAt: string;
    };

type Props = {
  notifications: Notif[];
  unreadMessages: number;
  upcomingCount: number;
  total: number;
};

function formatRelative(d: Date) {
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: CLINIC_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(d);
}

function formatTime(d: Date) {
  // Siempre en hora de la clínica — ver lib/clinic-time.ts.
  return formatClinicTime(d);
}

function initialFor(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => !/^(dr\.?|dra\.?)$/i.test(p));
  const first = parts[0] ?? "";
  return (first[0] ?? "?").toUpperCase();
}

export function NotificationsButton({
  notifications,
  unreadMessages,
  upcomingCount,
  total,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const messages = notifications.filter((n): n is Extract<Notif, { kind: "message" }> => n.kind === "message");
  const upcoming = notifications.filter((n): n is Extract<Notif, { kind: "upcoming" }> => n.kind === "upcoming");

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones${total > 0 ? ` (${total})` : ""}`}
        aria-expanded={open}
        className="relative flex items-center justify-center w-10 h-10 rounded-full transition-colors"
        style={{
          background: open ? "var(--vet-bg-card)" : "transparent",
          color: "var(--vet-text-2)",
        }}
      >
        <VetIcon name="bell" size={20} color="var(--vet-text-2)" />
        {total > 0 && (
          <span
            className="vet-mono absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{
              background: "var(--vet-red)",
              border: "2px solid var(--vet-bg-mid)",
              boxShadow: "0 2px 6px oklch(60% 0.20 20 / 0.40)",
            }}
          >
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notif-panel absolute right-0 top-12 z-50 w-[340px] sm:w-[380px] max-h-[70vh] overflow-hidden border flex flex-col"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            borderRadius: 18,
            boxShadow: "0 16px 48px oklch(20% 0.04 240 / 0.30)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{ borderBottomColor: "var(--vet-border)" }}
          >
            <div>
              <h3
                className="font-extrabold text-[15px] tracking-tight"
                style={{ color: "var(--vet-text-1)" }}
              >
                Notificaciones
              </h3>
              <p className="text-[11px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                {total === 0
                  ? "Estás al día"
                  : `${total} sin leer · ${unreadMessages} mensajes${upcomingCount ? ` · ${upcomingCount} cita${upcomingCount > 1 ? "s" : ""} próxima${upcomingCount > 1 ? "s" : ""}` : ""}`}
              </p>
            </div>
            {unreadMessages > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={pending}
                className="text-[11px] font-extrabold disabled:opacity-50"
                style={{ color: "var(--vet-green)" }}
              >
                {pending ? "..." : "Marcar leídas"}
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {total === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center"
                style={{ color: "var(--vet-text-3)" }}
              >
                <span className="text-[44px]">🎉</span>
                <p className="text-[13px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                  Todo bajo control
                </p>
                <p className="text-[12px] font-semibold">
                  No hay nada pendiente por ahora.
                </p>
              </div>
            ) : (
              <>
                {/* Upcoming section */}
                {upcoming.length > 0 && (
                  <Section title="Citas próximas">
                    {upcoming.map((u) => (
                      <Link
                        key={u.id}
                        href={`/vet/cita/${u.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors no-underline hover:[background:var(--vet-bg-hover)]"
                      >
                        <div
                          className="w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center"
                          style={{ background: "var(--vet-green-glow)" }}
                        >
                          <VetIcon name="calendar" size={16} color="var(--vet-green)" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[13px] font-extrabold truncate"
                            style={{ color: "var(--vet-text-1)" }}
                          >
                            {u.serviceName} · {u.petName}
                          </p>
                          <p
                            className="text-[12px] font-semibold truncate"
                            style={{ color: "var(--vet-text-3)" }}
                          >
                            con {u.clientName}
                          </p>
                        </div>
                        <span
                          className="vet-mono text-[12px] font-extrabold whitespace-nowrap pl-2"
                          style={{ color: "var(--vet-green)" }}
                        >
                          {formatTime(new Date(u.scheduledAt))}
                        </span>
                      </Link>
                    ))}
                  </Section>
                )}

                {/* Messages section */}
                {messages.length > 0 && (
                  <Section title="Mensajes nuevos">
                    {messages.map((m) => (
                      <Link
                        key={m.id}
                        href={`/vet/chat/${m.clientId}`}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors no-underline hover:[background:var(--vet-bg-hover)]"
                      >
                        <div
                          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-extrabold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--vet-blue), oklch(38% 0.18 280))",
                          }}
                        >
                          {initialFor(m.clientName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <p
                              className="text-[13px] font-extrabold truncate"
                              style={{ color: "var(--vet-text-1)" }}
                            >
                              {m.clientName}
                            </p>
                            <span
                              className="ml-auto text-[10px] font-semibold whitespace-nowrap"
                              style={{ color: "var(--vet-text-3)" }}
                            >
                              {formatRelative(new Date(m.lastAt))}
                            </span>
                          </div>
                          <p
                            className="text-[12px] font-semibold leading-snug line-clamp-2 mt-0.5"
                            style={{ color: "var(--vet-text-2)" }}
                          >
                            {m.preview}
                          </p>
                        </div>
                        {m.count > 1 && (
                          <span
                            className="vet-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded-full self-center"
                            style={{ background: "var(--vet-red)", color: "white" }}
                          >
                            {m.count}
                          </span>
                        )}
                      </Link>
                    ))}
                  </Section>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className="border-t flex-shrink-0"
            style={{ borderTopColor: "var(--vet-border)" }}
          >
            <Link
              href="/vet/chat"
              onClick={() => setOpen(false)}
              className="block text-center py-3 text-[12px] font-extrabold no-underline"
              style={{ color: "var(--vet-green)" }}
            >
              Ver todas las conversaciones →
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes notif-in {
          from { opacity: 0; transform: translateY(-6px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .notif-panel {
          animation: notif-in .18s cubic-bezier(.22,1,.36,1) both;
          transform-origin: top right;
        }
        @media (prefers-reduced-motion: reduce) {
          .notif-panel { animation: none; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider"
        style={{ color: "var(--vet-text-3)", background: "var(--vet-bg-mid)" }}
      >
        {title}
      </div>
      <div className="divide-y" style={{ borderColor: "var(--vet-border)" }}>
        {children}
      </div>
    </div>
  );
}
