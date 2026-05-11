"use client";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  Heart,
  User,
} from "lucide-react";
import { TabBar } from "./TabBar";

/**
 * Legacy bottom-tab bar for admin. The new /admin/* routes use a sidebar
 * (AdminShell) instead. This bar is still rendered on a few shared routes
 * (e.g. /perfil, /cita/[id]) so admins can navigate back to /admin.
 */
export function AdminTabBar() {
  return (
    <TabBar
      items={[
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/clientes", label: "Clientes", icon: Heart },
        { href: "/admin/veterinarios", label: "Vets", icon: Users },
        { href: "/admin/servicios", label: "Servicios", icon: Stethoscope },
        { href: "/admin/perfil", label: "Perfil", icon: User },
      ]}
    />
  );
}
