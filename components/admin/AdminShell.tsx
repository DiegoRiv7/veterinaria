"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

type Props = {
  adminName: string;
  adminInitials: string;
  adminPhotoUrl?: string | null;
  children: React.ReactNode;
};

export function AdminShell({
  adminName,
  adminInitials,
  adminPhotoUrl,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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
      <div className="hidden lg:block">
        <AdminSidebar
          adminName={adminName}
          adminInitials={adminInitials}
          adminPhotoUrl={adminPhotoUrl}
        />
      </div>

      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[260px] flex">
            <AdminSidebar
              adminName={adminName}
              adminInitials={adminInitials}
              adminPhotoUrl={adminPhotoUrl}
              onNavigate={() => setDrawerOpen(false)}
            />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
              className="absolute top-3 right-2 w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: "var(--vet-text-2)", background: "transparent" }}
            >
              <X size={20} />
            </button>
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
