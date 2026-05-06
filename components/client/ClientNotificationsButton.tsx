"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export type ClientNotifPreview = {
  id: string;
  kind: "message" | "appointment" | "birthday";
  title: string;
  body: string;
  icon: string;
  href: string;
  /** ISO string, serialised on the server. */
  at: string;
};

function formatRelative(d: Date): string {
  const now = Date.now();
  const ts = d.getTime();
  const diffMs = ts - now;
  const absMs = Math.abs(diffMs);
  const future = diffMs > 0;
  const min = Math.round(absMs / 60000);
  if (min < 60) return future ? `en ${min} min` : `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return future ? `en ${h}h` : `${h}h`;
  const days = Math.round(h / 24);
  if (days < 7) return future ? `en ${days}d` : `${days}d`;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export function ClientNotificationsButton({
  notifications,
  unreadCount,
}: {
  notifications: ClientNotifPreview[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside / escape
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

  const preview = notifications.slice(0, 5);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Avisos${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
        aria-expanded={open}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
        style={{
          color: "var(--color-foreground)",
          background: open ? "var(--color-surface)" : "transparent",
        }}
      >
        <Bell className="h-[22px] w-[22px]" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full text-white text-[10px] font-extrabold flex items-center justify-center px-1"
            style={{
              background: "#ef4444",
              boxShadow: "0 2px 6px rgba(239,68,68,0.5)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-24px)] rounded-[18px] overflow-hidden z-50"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 14px 44px rgba(206, 90, 45, 0.18)",
          }}
        >
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderBottomColor: "var(--color-border)" }}
          >
            <span
              className="text-[14px] font-extrabold"
              style={{ color: "var(--color-foreground)" }}
            >
              Avisos
            </span>
            {unreadCount > 0 && (
              <span
                className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{
                  background: "color-mix(in oklab, var(--color-brand) 12%, transparent)",
                  color: "var(--color-brand)",
                  border: "1px solid color-mix(in oklab, var(--color-brand) 28%, transparent)",
                }}
              >
                {unreadCount} {unreadCount === 1 ? "nuevo" : "nuevos"}
              </span>
            )}
          </div>

          {preview.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-[28px] mb-1.5">🔔</div>
              <p
                className="text-[13px] font-bold"
                style={{ color: "var(--color-foreground)" }}
              >
                Estás al día
              </p>
              <p
                className="text-[12px] font-semibold mt-0.5"
                style={{ color: "var(--color-muted)" }}
              >
                No tienes avisos por ahora.
              </p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {preview.map((n, i) => {
                const accent =
                  n.kind === "message"
                    ? "var(--color-brand)"
                    : n.kind === "appointment"
                    ? "var(--vet-blue, #f4c95e)"
                    : "var(--vet-amber, #d49247)";
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{
                      borderBottom:
                        i < preview.length - 1
                          ? "1px solid var(--color-border)"
                          : "none",
                    }}
                  >
                    <div
                      className="rounded-[12px] flex items-center justify-center text-[18px] shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        background: `color-mix(in oklab, ${accent} 14%, var(--color-surface-2, var(--color-surface)))`,
                      }}
                    >
                      {n.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-extrabold truncate"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {n.title}
                      </p>
                      <p
                        className="text-[12px] font-semibold leading-snug line-clamp-2"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {n.body}
                      </p>
                      <p
                        className="text-[11px] font-semibold mt-0.5"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {formatRelative(new Date(n.at))}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <Link
            href="/notificaciones"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center text-[13px] font-extrabold border-t transition-colors"
            style={{
              color: "var(--color-brand)",
              borderTopColor: "var(--color-border)",
              background: "var(--color-surface-2, var(--color-surface))",
            }}
          >
            Ver todas →
          </Link>
        </div>
      )}
    </div>
  );
}
