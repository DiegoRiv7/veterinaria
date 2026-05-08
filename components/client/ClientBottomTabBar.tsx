"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, Calendar, IdCard, User } from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
  matchPrefix?: string;
};

const TABS: Tab[] = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/salud", label: "Salud", icon: Heart, matchPrefix: "/salud" },
  { href: "/citas", label: "Citas", icon: Calendar, matchPrefix: "/citas" },
  { href: "/carnet", label: "Carnet", icon: IdCard, matchPrefix: "/carnet" },
  { href: "/perfil", label: "Perfil", icon: User, matchPrefix: "/perfil" },
];

export function ClientBottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="lg:hidden flex-shrink-0 pb-[max(0px,env(safe-area-inset-bottom))]"
      style={{
        background: "color-mix(in oklab, var(--color-surface) 80%, transparent)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        borderTop:
          "1px solid color-mix(in oklab, var(--color-border) 60%, transparent)",
      }}
    >
      <div className="flex items-center justify-around px-3 pt-2 pb-1.5">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.matchPrefix &&
              tab.matchPrefix !== "/" &&
              pathname.startsWith(tab.matchPrefix));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className="flex items-center justify-center w-12 h-10 rounded-[12px] transition-colors"
              style={{
                color: isActive ? "var(--color-brand)" : "var(--color-muted)",
              }}
            >
              <Icon
                className="h-[24px] w-[24px]"
                strokeWidth={isActive ? 2.4 : 1.7}
                fill={isActive ? "currentColor" : "none"}
                fillOpacity={isActive ? 0.12 : 0}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
