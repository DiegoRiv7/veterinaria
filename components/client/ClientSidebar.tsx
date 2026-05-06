"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  PawPrint,
  Bell,
  User,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  match?: (pathname: string) => boolean;
  badge?: number;
};

type Props = {
  userName: string;
  userPhotoUrl?: string | null;
  unreadNotifs: number;
  onNavigate?: () => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ClientSidebar({
  userName,
  userPhotoUrl,
  unreadNotifs,
  onNavigate,
}: Props) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/inicio",         label: "Inicio",   icon: Home,      match: (p) => p === "/inicio" },
    { href: "/citas",          label: "Citas",    icon: Calendar },
    { href: "/mascotas",       label: "Mascotas", icon: PawPrint },
    { href: "/notificaciones", label: "Avisos",   icon: Bell,      badge: unreadNotifs },
    { href: "/perfil",         label: "Perfil",   icon: User },
  ];

  return (
    <aside
      className="flex flex-col py-5 h-full overflow-hidden border-r"
      style={{
        width: 220,
        background: "var(--color-surface-2, var(--color-surface))",
        borderRightColor: "var(--color-border)",
      }}
    >
      {/* Logo banner */}
      <div className="px-2.5 mb-6">
        <Image
          src="/vetsfriend-banner.png"
          alt="Vetsfriend — Clínica & Grooming"
          width={1200}
          height={400}
          priority
          className="w-full h-auto rounded-[20px]"
          style={{
            border: "1px solid var(--color-border)",
            boxShadow: "0 8px 22px rgba(206, 90, 45, 0.14)",
          }}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-2.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = item.match
            ? item.match(pathname)
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all"
              style={{
                background: isActive
                  ? "color-mix(in oklab, var(--color-brand) 15%, transparent)"
                  : "transparent",
                color: isActive ? "var(--color-brand)" : "var(--color-muted)",
                fontWeight: isActive ? 700 : 600,
                fontSize: 14,
              }}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r"
                  style={{ background: "var(--color-brand)" }}
                />
              )}
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: "#ef4444" }}
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <Link
        href="/perfil"
        onClick={onNavigate}
        className="flex items-center gap-2.5 mx-2.5 mt-3 p-3 rounded-[14px] transition-colors"
        style={{
          background: "var(--color-surface)",
          color: "var(--color-foreground)",
        }}
      >
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-[14px] text-white flex-shrink-0"
          style={{
            background: userPhotoUrl
              ? "var(--color-surface-2, var(--color-surface))"
              : "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 60%, oklch(45% 0.12 38)))",
          }}
        >
          {userPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userPhotoUrl}
              alt={userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials(userName)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[13px] font-bold truncate"
            style={{ color: "var(--color-foreground)" }}
          >
            {userName}
          </div>
          <div
            className="text-[11px] font-semibold"
            style={{ color: "var(--color-muted)" }}
          >
            Cliente
          </div>
        </div>
      </Link>
    </aside>
  );
}
