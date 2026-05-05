"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VetIcon } from "./VetIcon";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentProps<typeof VetIcon>["name"];
  match?: (pathname: string) => boolean;
  badge?: number;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/vet",           label: "Dashboard",   icon: "dashboard", match: (p) => p === "/vet" },
  { href: "/vet/hoy",       label: "Hoy",         icon: "today" },
  { href: "/vet/calendario", label: "Calendario", icon: "calendar" },
  { href: "/vet/pacientes", label: "Pacientes",   icon: "patients" },
  { href: "/vet/historial", label: "Historial",   icon: "records" },
  { href: "/vet/inventario", label: "Inventario", icon: "stock" },
  { href: "/vet/chat",      label: "Chat",        icon: "chat" },
];

type Props = {
  vetName: string;
  vetInitials: string;
  unreadChat: number;
  onNavigate?: () => void;
};

export function VetSidebar({ vetName, vetInitials, unreadChat, onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col py-5 h-full overflow-hidden border-r"
      style={{
        width: 220,
        background: "var(--vet-bg-mid)",
        borderRightColor: "var(--vet-border)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 mb-8">
        <div
          className="rounded-[12px] flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{
            width: 38,
            height: 38,
            background: "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
            boxShadow: "0 4px 16px var(--vet-green-glow)",
          }}
        >
          <VetIcon name="paw" size={20} color="white" />
        </div>
        <div>
          <div className="font-black text-[15px] tracking-tight" style={{ color: "var(--vet-green)" }}>
            Vetsfriend
          </div>
          <div className="text-[10px] font-bold tracking-wider" style={{ color: "var(--vet-text-3)" }}>
            CLÍNICA &amp; GROOMING
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-2.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match
            ? item.match(pathname)
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const showChatBadge = item.icon === "chat" && unreadChat > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all"
              style={{
                background: isActive ? "var(--vet-green-glow)" : "transparent",
                color: isActive ? "var(--vet-green)" : "var(--vet-text-2)",
                fontWeight: isActive ? 700 : 600,
                fontSize: 14,
              }}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r"
                  style={{ background: "var(--vet-green)" }}
                />
              )}
              <VetIcon
                name={item.icon}
                size={18}
                color={isActive ? "var(--vet-green)" : "var(--vet-text-3)"}
              />
              <span className="flex-1">{item.label}</span>
              {showChatBadge && (
                <span
                  className="vet-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: "var(--vet-red)" }}
                >
                  {unreadChat > 9 ? "9+" : unreadChat}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <Link
        href="/vet/perfil"
        onClick={onNavigate}
        className="flex items-center gap-2.5 mx-2.5 mt-3 p-3 rounded-[14px] transition-colors"
        style={{ background: "var(--vet-bg-card)", color: "var(--vet-text-1)" }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[14px] text-white flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--vet-blue), oklch(38% 0.18 280))",
          }}
        >
          {vetInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold truncate" style={{ color: "var(--vet-text-1)" }}>
            {vetName}
          </div>
          <div className="text-[11px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
            Veterinario
          </div>
        </div>
      </Link>
    </aside>
  );
}
