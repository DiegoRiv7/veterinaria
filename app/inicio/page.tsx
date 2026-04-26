import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader, SectionTitle } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientTabBar } from "@/components/ClientTabBar";
import { EmptyState } from "@/components/EmptyState";
import { PetAvatar } from "@/components/PetAvatar";
import BirthdayBanner from "@/components/BirthdayBanner";
import { formatDate, formatTime, SPECIES_LABEL, ageFromBirthDate } from "@/lib/utils";
import { getUnreadByAppointment } from "@/lib/chat";
import { CalendarPlus, ChevronRight, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientHome() {
  const session = await readSession();
  if (!session) redirect("/login");

  const [upcoming, pets] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        clientId: session.userId,
        status: "SCHEDULED",
        scheduledAt: { gte: new Date() },
      },
      include: { pet: true, service: true, vet: { include: { user: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.pet.findMany({
      where: { ownerId: session.userId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const unreadByAppt = await getUnreadByAppointment(
    session.userId,
    upcoming.map((a) => a.id)
  );

  return (
    <AppShell>
      <PageContainer>
        <PageHeader title={`Hola, ${session.name.split(" ")[0]}`} subtitle="Tus citas de un vistazo." />

        <BirthdayBanner
          pets={pets.map((p) => ({
            id: p.id,
            name: p.name,
            species: p.species,
            birthDate: p.birthDate,
          }))}
        />

        <Link href="/agendar">
          <div className="relative mb-6 overflow-hidden rounded-[20px] p-5 bg-gradient-to-br from-[#10b981] via-[#06b6d4] to-[#3b82f6] shadow-[0_14px_40px_rgba(16,185,129,0.28),0_6px_20px_rgba(59,130,246,0.20)] hover:brightness-105 transition flex items-center gap-4">
            <div className="h-12 w-12 rounded-[14px] bg-white/25 backdrop-blur flex items-center justify-center">
              <CalendarPlus className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 text-white">
              <p className="font-semibold text-[17px]">Agendar cita</p>
              <p className="text-sm text-white/85">Reserva en unos segundos</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/85" />
          </div>
        </Link>

        <SectionTitle>Próximas</SectionTitle>
        {upcoming.length === 0 ? (
          <EmptyState
            emoji={null}
            title="Todo tranquilo por aquí"
            description="No tienes citas próximas."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((a) => {
              const unread = unreadByAppt.get(a.id) ?? 0;
              return (
                <Link key={a.id} href={`/cita/${a.id}`}>
                  <Card
                    className={`hover:shadow-[var(--shadow-ios-md)] transition ${
                      unread > 0 ? "ring-2 ring-[#ef4444]/30" : ""
                    }`}
                  >
                    <CardBody className="flex items-center gap-4">
                      <div className="relative">
                        <PetAvatar
                          size="md"
                          photoUrl={a.pet.photoUrl}
                          species={a.pet.species}
                          name={a.pet.name}
                        />
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] rounded-full bg-[#ef4444] text-white text-[10px] leading-none font-semibold px-1 flex items-center justify-center shadow-[0_2px_6px_rgba(239,68,68,0.5)] ring-2 ring-[var(--color-surface)]">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[16px] truncate">{a.service.name}</p>
                        <p className="text-[13px] text-[var(--color-muted)] truncate">
                          {a.pet.name} · {a.vet.user.name}
                        </p>
                        {unread > 0 && (
                          <p className="text-[12px] mt-0.5 text-[#ef4444] font-medium flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {unread === 1
                              ? "1 mensaje nuevo del veterinario"
                              : `${unread} mensajes nuevos del veterinario`}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-medium capitalize">{formatDate(a.scheduledAt)}</p>
                        <p className="text-[13px] text-[var(--color-muted)]">{formatTime(a.scheduledAt)}</p>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <SectionTitle>Mis mascotas</SectionTitle>
        {pets.length === 0 ? (
          <EmptyState
            emoji="🐶"
            title="Aún no tienes mascotas"
            description="Agrega a tu peludito para empezar a agendar visitas."
            action={
              <Link href="/mascotas/nueva">
                <Button>Agregar mascota</Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {pets.map((p) => {
              const age = ageFromBirthDate(p.birthDate);
              const sub = [SPECIES_LABEL[p.species], p.breed, age].filter(Boolean).join(" · ");
              return (
                <Link key={p.id} href={`/mascotas/${p.id}`}>
                  <Card className="hover:shadow-[var(--shadow-ios-md)] hover:border-[var(--color-brand)]/30 transition">
                    <CardBody className="flex items-center gap-4">
                      <PetAvatar
                        size="md"
                        photoUrl={p.photoUrl}
                        species={p.species}
                        name={p.name}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[16px] truncate">{p.name}</p>
                        <p className="text-[13px] text-[var(--color-muted)] truncate">{sub}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[var(--color-muted-2)]" />
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
            <Link
              href="/mascotas/nueva"
              className="text-center text-[14px] font-medium text-[var(--color-brand)] py-2"
            >
              + Agregar otra mascota
            </Link>
          </div>
        )}
      </PageContainer>
      <ClientTabBar />
    </AppShell>
  );
}
