"use client";
import { LayoutGrid, Stethoscope, Users, BarChart3, User } from "lucide-react";
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
        { href: "/admin", label: "Panel", icon: LayoutGrid },
        { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
        { href: "/admin/servicios", label: "Servicios", icon: Stethoscope },
        { href: "/admin/veterinarios", label: "Vets", icon: Users },
        { href: "/admin/perfil", label: "Perfil", icon: User },
      ]}
    />
  );
}
