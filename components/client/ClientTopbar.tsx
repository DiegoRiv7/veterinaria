"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
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
}: {
  unreadNotifs: number;
  notifPreviews: ClientNotifPreview[];
}) {
  const pathname = usePathname();
  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 border-b flex-shrink-0 pt-[max(0px,env(safe-area-inset-top))]"
      style={{
        height: "calc(60px + env(safe-area-inset-top, 0px))",
        background: "color-mix(in oklab, var(--color-surface) 95%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottomColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Logo on mobile (sidebar already shows it on desktop) */}
        <Image
          src="/vetsfriend-icon-192.png"
          alt=""
          width={32}
          height={32}
          priority
          className="lg:hidden rounded-[8px] shrink-0"
        />
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
