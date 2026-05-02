import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader, SectionTitle } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { AdminTabBar } from "@/components/AdminTabBar";
import { Stethoscope, Clock, Users, Tag, ChevronRight, CalendarDays, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const [svcCount, vetCount, apptCount, upcomingCount] = await Promise.all([
    prisma.service.count(),
    prisma.veterinarian.count(),
    prisma.appointment.count(),
    prisma.appointment.count({
      where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
    }),
  ]);

  const tiles = [
    { href: "/admin/reportes", label: "Reportes y estadísticas", icon: BarChart3, hint: "Rendimiento por vet, ingresos, exportación" },
    { href: "/admin/servicios", label: "Servicios", icon: Stethoscope, hint: `${svcCount} activos` },
    { href: "/admin/tarifas", label: "Tarifas por especie", icon: Tag, hint: "Multiplicadores" },
    { href: "/admin/horario", label: "Horario de la clínica", icon: Clock, hint: "Días y horas" },
    { href: "/admin/veterinarios", label: "Veterinarios", icon: Users, hint: `${vetCount} registrados` },
    { href: "/vet/calendario", label: "Agenda del día", icon: CalendarDays, hint: `${upcomingCount} próximas` },
  ];

  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Panel de administración" subtitle="Configura tu clínica." />

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody>
              <p className="text-[13px] text-[var(--color-muted)]">Citas totales</p>
              <p className="text-[28px] font-semibold">{apptCount}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-[13px] text-[var(--color-muted)]">Próximas</p>
              <p className="text-[28px] font-semibold">{upcomingCount}</p>
            </CardBody>
          </Card>
        </div>

        <SectionTitle>Configuración</SectionTitle>
        <div className="flex flex-col gap-2">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href}>
                <Card className="hover:shadow-[var(--shadow-ios-md)] transition">
                  <CardBody className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-[14px] bg-[var(--color-brand-soft)] flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[var(--color-brand)]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{t.label}</p>
                      <p className="text-[13px] text-[var(--color-muted)]">{t.hint}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[var(--color-muted)]" />
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </PageContainer>
      <AdminTabBar />
    </AppShell>
  );
}
