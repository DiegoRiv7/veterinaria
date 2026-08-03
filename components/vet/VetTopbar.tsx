"use client";

import { usePathname } from "next/navigation";
import { VetIcon } from "./VetIcon";
import { NotificationsButton } from "./NotificationsButton";

type NotifData = React.ComponentProps<typeof NotificationsButton>;

const TITLES: Record<string, string> = {
  "/vet": "Dashboard",
  "/vet/hoy": "Citas de Hoy",
  "/vet/calendario": "Calendario",
  "/vet/pacientes": "Pacientes",
  "/vet/historial": "Historial Clínico",
  "/vet/inventario": "Inventario",
  "/vet/chat": "Chat",
  "/vet/perfil": "Mi Perfil",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/vet/cita/")) return "Detalle de Cita";
  if (pathname.startsWith("/vet/chat/")) return "Chat";
  if (/^\/vet\/pacientes\/[^/]+\/carnet/.test(pathname))
    return "Pasaporte de Vacunación";
  return "Panel Veterinario";
}

function todayChip() {
  const d = new Date();
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(".", "");
}

type Props = {
  notifications: NotifData;
  onMenuClick?: () => void;
};

export function VetTopbar({ notifications, onMenuClick }: Props) {
  const pathname = usePathname();

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-7 border-b flex-shrink-0"
      style={{
        height: 60,
        background: "var(--vet-bg-mid)",
        borderBottomColor: "var(--vet-border)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="lg:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-lg transition-colors"
          style={{ color: "var(--vet-text-2)" }}
        >
          <VetIcon name="menu" size={22} />
        </button>
        <div className="font-extrabold text-[17px] truncate" style={{ color: "var(--vet-text-1)" }}>
          {titleFor(pathname)}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3.5">
        <NotificationsButton {...notifications} />

        {/* Date chip — hidden on small mobile */}
        <div
          className="hidden sm:block px-3.5 py-1.5 rounded-full text-[12px] font-bold border"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-2)",
          }}
        >
          {todayChip()}
        </div>

        {/* Status */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: "var(--vet-green)",
              boxShadow: "0 0 6px var(--vet-green-glow)",
            }}
          />
          <span className="text-[12px] font-bold" style={{ color: "var(--vet-text-3)" }}>
            En consulta
          </span>
        </div>
      </div>
    </header>
  );
}
