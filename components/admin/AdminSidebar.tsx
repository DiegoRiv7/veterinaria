"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  Clock,
  Tag,
  UserCircle2,
  Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/admin" },
  { href: "/admin/clientes", label: "Clientes", icon: Heart },
  { href: "/admin/veterinarios", label: "Veterinarios", icon: Users },
  { href: "/admin/servicios", label: "Servicios", icon: Stethoscope },
  { href: "/admin/horario", label: "Horario", icon: Clock },
  { href: "/admin/tarifas", label: "Tarifas", icon: Tag },
];

type Props = {
  adminName: string;
  adminInitials: string;
  adminPhotoUrl?: string | null;
  onNavigate?: () => void;
};

export function AdminSidebar({
  adminName,
  adminInitials,
  adminPhotoUrl,
  onNavigate,
}: Props) {
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
      <div className="px-1 mb-6">
        <Image
          src="/vetsfriend-banner.png"
          alt="Vetsfriend — Clínica & Grooming"
          width={1200}
          height={400}
          priority
          className="w-full h-auto rounded-[20px]"
          style={{
            border: "1px solid var(--vet-border)",
            boxShadow: "0 8px 22px rgba(206, 90, 45, 0.14)",
          }}
        />
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
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
              <Icon
                size={18}
                color={isActive ? "var(--vet-green)" : "var(--vet-text-3)"}
                strokeWidth={isActive ? 2.4 : 2.0}
              />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/admin/perfil"
        onClick={onNavigate}
        className="flex items-center gap-2.5 mx-2.5 mt-3 p-3 rounded-[14px] transition-colors"
        style={{ background: "var(--vet-bg-card)", color: "var(--vet-text-1)" }}
      >
        <div
          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-[14px] text-white flex-shrink-0"
          style={{
            background: adminPhotoUrl
              ? "var(--vet-bg-mid)"
              : "linear-gradient(135deg, var(--vet-violet), oklch(38% 0.18 280))",
          }}
        >
          {adminPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={adminPhotoUrl}
              alt={adminName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{adminInitials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[13px] font-bold truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            {adminName}
          </div>
          <div
            className="text-[11px] font-semibold flex items-center gap-1"
            style={{ color: "var(--vet-text-3)" }}
          >
            <UserCircle2 size={11} /> Administrador
          </div>
        </div>
      </Link>
    </aside>
  );
}
