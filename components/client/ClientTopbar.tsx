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
      className="flex items-center justify-between px-4 sm:px-6 flex-shrink-0 pt-[max(0px,env(safe-area-inset-top))]"
      style={{
        height: "calc(54px + env(safe-area-inset-top, 0px))",
        // Translucent — lets the page background bleed through so the
        // chrome reads as part of the same surface, not a separate strip.
        background: "color-mix(in oklab, var(--color-surface) 60%, transparent)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Compact logo on mobile only */}
        <Image
          src="/vetsfriend-icon-192.png"
          alt=""
          width={28}
          height={28}
          priority
          className="lg:hidden rounded-[7px] shrink-0"
        />
        <div
          className="font-extrabold text-[16px] tracking-tight truncate"
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
