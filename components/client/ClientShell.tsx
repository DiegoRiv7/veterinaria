"use client";

import { ClientSidebar } from "./ClientSidebar";
import { ClientTopbar } from "./ClientTopbar";
import { ClientBottomTabBar } from "./ClientBottomTabBar";
import type { ClientNotifPreview } from "./ClientNotificationsButton";

type Props = {
  userName: string;
  userPhotoUrl?: string | null;
  unreadNotifs: number;
  notifPreviews: ClientNotifPreview[];
  children: React.ReactNode;
};

export function ClientShell({
  userName,
  userPhotoUrl,
  unreadNotifs,
  notifPreviews,
  children,
}: Props) {
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

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ClientTopbar
          unreadNotifs={unreadNotifs}
          notifPreviews={notifPreviews}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <ClientBottomTabBar />
      </div>
    </div>
  );
}
