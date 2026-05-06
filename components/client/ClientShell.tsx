"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { ClientSidebar } from "./ClientSidebar";
import { ClientTopbar } from "./ClientTopbar";

type Props = {
  userName: string;
  userPhotoUrl?: string | null;
  unreadNotifs: number;
  children: React.ReactNode;
};

export function ClientShell({
  userName,
  userPhotoUrl,
  unreadNotifs,
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
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <ClientSidebar
          userName={userName}
          userPhotoUrl={userPhotoUrl}
          unreadNotifs={unreadNotifs}
        />
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
            <ClientSidebar
              userName={userName}
              userPhotoUrl={userPhotoUrl}
              unreadNotifs={unreadNotifs}
              onNavigate={() => setDrawerOpen(false)}
            />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
              className="absolute top-3 right-2 w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: "var(--color-foreground)", background: "transparent" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ClientTopbar
          unreadNotifs={unreadNotifs}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
