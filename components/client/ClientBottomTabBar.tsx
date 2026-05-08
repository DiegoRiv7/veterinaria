"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  icon: string;
  matchPrefix?: string;
};

const TABS: Tab[] = [
  { href: "/inicio", label: "Inicio", icon: "🏠" },
  { href: "/salud", label: "Salud", icon: "❤️", matchPrefix: "/salud" },
  { href: "/citas", label: "Citas", icon: "📅", matchPrefix: "/citas" },
  { href: "/carnet", label: "Carnet", icon: "🪪", matchPrefix: "/carnet" },
  { href: "/perfil", label: "Perfil", icon: "👤", matchPrefix: "/perfil" },
];

export function ClientBottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="lg:hidden flex-shrink-0 border-t pb-[max(0px,env(safe-area-inset-bottom))]"
      style={{
        background: "color-mix(in oklab, var(--color-surface) 96%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTopColor: "var(--color-border)",
      }}
    >
      <div className="grid grid-cols-5 px-1 pt-1.5 pb-1">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.matchPrefix &&
              tab.matchPrefix !== "/" &&
              pathname.startsWith(tab.matchPrefix));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 py-1.5 rounded-[14px]"
              style={{
                color: isActive
                  ? "var(--color-brand)"
                  : "var(--color-muted)",
              }}
            >
              <span className="text-[22px] leading-none">{tab.icon}</span>
              <span
                className="text-[10px]"
                style={{
                  fontWeight: isActive ? 800 : 600,
                }}
              >
                {tab.label}
              </span>
              {isActive && (
                <span
                  aria-hidden
                  className="rounded-full mt-0.5"
                  style={{
                    width: 14,
                    height: 2,
                    background: "var(--color-brand)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
