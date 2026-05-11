"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/clientes": "Clientes",
  "/admin/veterinarios": "Veterinarios",
  "/admin/servicios": "Servicios",
  "/admin/horario": "Horario de la clínica",
  "/admin/tarifas": "Tarifas por especie",
  "/admin/perfil": "Mi perfil",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/admin/veterinarios/")) return "Veterinario";
  if (pathname.startsWith("/admin/clientes/")) return "Cliente";
  return "Administración";
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

type Props = { onMenuClick?: () => void };

export function AdminTopbar({ onMenuClick }: Props) {
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
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="lg:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-lg transition-colors"
          style={{ color: "var(--vet-text-2)" }}
        >
          <Menu size={22} />
        </button>
        <div
          className="font-extrabold text-[17px] truncate"
          style={{ color: "var(--vet-text-1)" }}
        >
          {titleFor(pathname)}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3.5">
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
        <div className="hidden sm:flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: "var(--vet-green)",
              boxShadow: "0 0 6px var(--vet-green-glow)",
            }}
          />
          <span
            className="text-[12px] font-bold"
            style={{ color: "var(--vet-text-3)" }}
          >
            En línea
          </span>
        </div>
      </div>
    </header>
  );
}
