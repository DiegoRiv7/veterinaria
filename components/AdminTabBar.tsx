"use client";
import { LayoutGrid, Stethoscope, Clock, Users, User } from "lucide-react";
import { TabBar } from "./TabBar";

export function AdminTabBar() {
  return (
    <TabBar
      items={[
        { href: "/admin", label: "Panel", icon: LayoutGrid },
        { href: "/admin/servicios", label: "Servicios", icon: Stethoscope },
        { href: "/admin/horario", label: "Horario", icon: Clock },
        { href: "/admin/veterinarios", label: "Vets", icon: Users },
        { href: "/perfil", label: "Perfil", icon: User },
      ]}
    />
  );
}
