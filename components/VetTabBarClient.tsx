"use client";
import { Home, CalendarDays, MessageCircle, User } from "lucide-react";
import { TabBar } from "./TabBar";

export function VetTabBarClient({ unreadChat }: { unreadChat: number }) {
  return (
    <TabBar
      items={[
        { href: "/vet", label: "Hoy", icon: Home },
        { href: "/vet/calendario", label: "Calendario", icon: CalendarDays },
        { href: "/vet/chat", label: "Chat", icon: MessageCircle, badge: unreadChat },
        { href: "/perfil", label: "Perfil", icon: User },
      ]}
    />
  );
}
