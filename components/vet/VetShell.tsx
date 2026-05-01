"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { VetSidebar } from "./VetSidebar";
import { VetTopbar } from "./VetTopbar";
import { VetIcon } from "./VetIcon";
import type { NotificationsButton } from "./NotificationsButton";

type NotifData = React.ComponentProps<typeof NotificationsButton>;

type Props = {
  vetName: string;
  vetInitials: string;
  unreadChat: number;
  notifications: NotifData;
  children: React.ReactNode;
};

export function VetShell({
  vetName,
  vetInitials,
  unreadChat,
  notifications,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [drawerOpen]);

  return (
    <div className="vet-theme flex h-[100dvh] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <VetSidebar vetName={vetName} vetInitials={vetInitials} unreadChat={unreadChat} />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[260px] flex">
            <VetSidebar
              vetName={vetName}
              vetInitials={vetInitials}
              unreadChat={unreadChat}
              onNavigate={() => setDrawerOpen(false)}
            />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
              className="absolute top-3 right-2 w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: "var(--vet-text-2)", background: "transparent" }}
            >
              <VetIcon name="close" size={20} />
            </button>
          </div>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <VetTopbar notifications={notifications} onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
