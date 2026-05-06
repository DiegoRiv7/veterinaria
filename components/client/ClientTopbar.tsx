"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";

const TITLES: Record<string, string> = {
  "/inicio": "Inicio",
  "/citas": "Mis citas",
  "/mascotas": "Mis mascotas",
  "/notificaciones": "Avisos",
  "/perfil": "Mi perfil",
  "/agendar": "Agendar cita",
  "/mascotas/nueva": "Nueva mascota",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/cita/")) return "Detalle de cita";
  if (pathname.startsWith("/mascotas/") && pathname.endsWith("/citas")) return "Citas";
  if (pathname.startsWith("/mascotas/") && pathname.endsWith("/editar")) return "Editar mascota";
  if (pathname.startsWith("/mascotas/")) return "Mascota";
  return "Vetsfriend";
}

export function ClientTopbar({
  unreadNotifs,
  onMenuClick,
}: {
  unreadNotifs: number;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 border-b flex-shrink-0"
      style={{
        height: 60,
        background: "var(--color-surface-2, var(--color-surface))",
        borderBottomColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="flex items-center justify-center w-10 h-10 -ml-2 rounded-lg transition-colors"
          style={{ color: "var(--color-foreground)" }}
        >
          <Menu className="h-[22px] w-[22px]" />
        </button>
        <div
          className="font-extrabold text-[17px] truncate"
          style={{ color: "var(--color-foreground)" }}
        >
          {titleFor(pathname)}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/notificaciones"
          aria-label="Avisos"
          className="relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
          style={{ color: "var(--color-foreground)" }}
        >
          <Bell className="h-[22px] w-[22px]" />
          {unreadNotifs > 0 && (
            <span
              className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full text-white text-[10px] font-extrabold flex items-center justify-center px-1"
              style={{
                background: "#ef4444",
                boxShadow: "0 2px 6px rgba(239,68,68,0.5)",
              }}
            >
              {unreadNotifs > 9 ? "9+" : unreadNotifs}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
