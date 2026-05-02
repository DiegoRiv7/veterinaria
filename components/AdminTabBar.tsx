"use client";
import { LayoutGrid, Stethoscope, Users, BarChart3, User } from "lucide-react";
import { TabBar } from "./TabBar";

export function AdminTabBar() {
  return (
    <TabBar
      items={[
        { href: "/admin", label: "Panel", icon: LayoutGrid },
        { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
        { href: "/admin/servicios", label: "Servicios", icon: Stethoscope },
        { href: "/admin/veterinarios", label: "Vets", icon: Users },
        { href: "/perfil", label: "Perfil", icon: User },
      ]}
    />
  );
}
