"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  ClientNotificationsButton,
  type ClientNotifPreview,
} from "./ClientNotificationsButton";

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
  notifPreviews,
  onMenuClick,
}: {
  unreadNotifs: number;
  notifPreviews: ClientNotifPreview[];
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
          className="lg:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-lg transition-colors"
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
        <ClientNotificationsButton
          notifications={notifPreviews}
          unreadCount={unreadNotifs}
        />
      </div>
    </header>
  );
}
