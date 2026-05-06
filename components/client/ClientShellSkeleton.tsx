"use client";

import Image from "next/image";
import { Menu, Bell } from "lucide-react";
import { Home, Calendar, PawPrint, User } from "lucide-react";

const NAV_ITEMS = [
  { label: "Inicio", icon: Home },
  { label: "Citas", icon: Calendar },
  { label: "Mascotas", icon: PawPrint },
  { label: "Avisos", icon: Bell },
  { label: "Perfil", icon: User },
];

/**
 * Static counterpart to ClientShell, used by loading.tsx files so the
 * top bar + sidebar stay in place while the page below transitions.
 * No drawer state, no real data — just the chrome.
 */
export function ClientShellSkeleton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Desktop sidebar (mockup) */}
      <aside
        className="hidden lg:flex flex-col py-5 h-full overflow-hidden border-r"
        style={{
          width: 220,
          background: "var(--color-surface-2, var(--color-surface))",
          borderRightColor: "var(--color-border)",
        }}
      >
        <div className="px-2.5 mb-6">
          <Image
            src="/vetsfriend-banner.png"
            alt=""
            width={1200}
            height={400}
            priority={false}
            className="w-full h-auto rounded-[20px]"
            style={{
              border: "1px solid var(--color-border)",
              boxShadow: "0 8px 22px rgba(206, 90, 45, 0.14)",
            }}
          />
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-2.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                style={{ color: "var(--color-muted)", fontSize: 14 }}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.label}</span>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="flex items-center justify-between px-4 sm:px-6 border-b flex-shrink-0"
          style={{
            height: 60,
            background: "var(--color-surface-2, var(--color-surface))",
            borderBottomColor: "var(--color-border)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="lg:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-lg"
              style={{ color: "var(--color-foreground)" }}
            >
              <Menu className="h-[22px] w-[22px]" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg"
              style={{ color: "var(--color-foreground)" }}
            >
              <Bell className="h-[22px] w-[22px]" />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
