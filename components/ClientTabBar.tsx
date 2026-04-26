"use client";
import { Home, CalendarPlus, PawPrint, User } from "lucide-react";
import { TabBar } from "./TabBar";

export function ClientTabBar() {
  return (
    <TabBar
      items={[
        { href: "/inicio", label: "Inicio", icon: Home },
        { href: "/agendar", label: "Agendar", icon: CalendarPlus },
        { href: "/mascotas", label: "Mascotas", icon: PawPrint },
        { href: "/perfil", label: "Perfil", icon: User },
      ]}
    />
  );
}
