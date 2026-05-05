"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; emoji: string; matchPrefix?: string };

const TABS: Tab[] = [
  { href: "/inicio",         label: "Inicio",   emoji: "🏠" },
  { href: "/citas",          label: "Citas",    emoji: "📅", matchPrefix: "/citas" },
  { href: "/mascotas",       label: "Mascotas", emoji: "🐾", matchPrefix: "/mascotas" },
  { href: "/notificaciones", label: "Avisos",   emoji: "🔔" },
  { href: "/perfil",         label: "Perfil",   emoji: "👤" },
];

export function ClientTabBar({ unreadNotifs = 0 }: { unreadNotifs?: number }) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[max(0px,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[480px] px-3 pb-3">
        <div
          className="grid grid-cols-5 gap-1 p-1.5 rounded-[22px] backdrop-blur-2xl"
          style={{
            background: "color-mix(in oklab, var(--color-surface) 80%, transparent)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 10px 28px rgba(206, 90, 45, 0.10)",
          }}
        >
          {TABS.map((tab) => {
            const active =
              pathname === tab.href ||
              (tab.matchPrefix &&
                tab.matchPrefix !== "/" &&
                pathname.startsWith(tab.matchPrefix));
            const isAvisos = tab.href === "/notificaciones";
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-[16px] transition-all"
                )}
                style={{
                  color: active ? "var(--color-brand)" : "var(--color-muted)",
                  fontWeight: active ? 800 : 600,
                }}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute -top-[7px] left-1/2 -translate-x-1/2 h-[3px] w-6 rounded-full"
                    style={{ background: "var(--color-brand)" }}
                  />
                )}
                <span className="relative text-[22px] leading-none">
                  {tab.emoji}
                  {isAvisos && unreadNotifs > 0 && (
                    <span
                      className="absolute -top-1 -right-2 min-w-[16px] h-[16px] rounded-full text-white text-[9px] font-extrabold flex items-center justify-center px-1"
                      style={{
                        background: "var(--color-danger, #ef4444)",
                        boxShadow: "0 2px 6px rgba(239,68,68,0.5)",
                      }}
                    >
                      {unreadNotifs > 9 ? "9+" : unreadNotifs}
                    </span>
                  )}
                </span>
                <span className="text-[10px]">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
