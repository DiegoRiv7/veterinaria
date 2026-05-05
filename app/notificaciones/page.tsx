import { redirect } from "next/navigation";
import Link from "next/link";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer } from "@/components/ui/page";
import { ClientTabBar } from "@/components/ClientTabBar";
import { getClientNotifications } from "@/lib/client-notifications";

export const dynamic = "force-dynamic";

function relativeTime(d: Date): string {
  const now = Date.now();
  const ts = d.getTime();
  const diffMs = ts - now;
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  const hours = Math.round(absMs / 3600000);
  const days = Math.round(absMs / 86400000);
  const future = diffMs > 0;
  if (minutes < 60) return future ? `en ${minutes} min` : `hace ${minutes} min`;
  if (hours < 24) return future ? `en ${hours}h` : `hace ${hours}h`;
  if (days < 7) return future ? `en ${days}d` : `hace ${days}d`;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export default async function NotificacionesPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const { notifications, unreadCount } = await getClientNotifications(session.userId);

  return (
    <AppShell>
      <PageContainer>
        <div className="flex items-center justify-between mb-5">
          <h1
            className="text-[26px] font-black tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            Avisos
          </h1>
          {unreadCount > 0 && (
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide"
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

        {notifications.length === 0 ? (
          <div
            className="rounded-[20px] py-16 px-6 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-[42px] mb-3">🔔</p>
            <p
              className="text-[15px] font-bold mb-1"
              style={{ color: "var(--color-foreground)" }}
            >
              Estás al día
            </p>
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-muted)" }}>
              No tienes avisos nuevos por el momento.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {notifications.map((n) => {
              const accent =
                n.kind === "message"
                  ? "var(--color-brand)"
                  : n.kind === "appointment"
                  ? "var(--vet-blue, #f4c95e)"
                  : "var(--vet-amber, #d49247)";
              return (
                <Link key={n.id} href={n.href} className="block">
                  <div
                    className="rounded-[18px] p-4 flex items-start gap-3.5 hover:brightness-[1.02] transition"
                    style={{
                      background: n.read
                        ? "var(--color-surface)"
                        : `color-mix(in oklab, ${accent} 8%, var(--color-surface))`,
                      border: `1.5px solid ${
                        n.read
                          ? "var(--color-border)"
                          : `color-mix(in oklab, ${accent} 28%, var(--color-border))`
                      }`,
                    }}
                  >
                    <div
                      className="rounded-[14px] flex items-center justify-center text-[22px] shrink-0"
                      style={{
                        width: 42,
                        height: 42,
                        background: "var(--color-surface-2, var(--color-surface))",
                      }}
                    >
                      {n.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p
                          className="text-[14px] truncate"
                          style={{
                            color: "var(--color-foreground)",
                            fontWeight: n.read ? 700 : 800,
                          }}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <span
                            aria-hidden
                            className="rounded-full shrink-0"
                            style={{
                              width: 8,
                              height: 8,
                              background: accent,
                            }}
                          />
                        )}
                      </div>
                      <p
                        className="text-[13px] font-semibold leading-snug"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {n.body}
                      </p>
                      <p
                        className="text-[11px] font-semibold mt-1"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {relativeTime(n.at)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </PageContainer>
      <ClientTabBar unreadNotifs={unreadCount} />
    </AppShell>
  );
}
