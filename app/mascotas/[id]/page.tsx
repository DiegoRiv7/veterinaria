import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, SectionTitle } from "@/components/ui/page";
import { Card, CardBody, List, ListItem } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientTabBar } from "@/components/ClientTabBar";
import { PetAvatar } from "@/components/PetAvatar";
import { EmptyState } from "@/components/EmptyState";
import { DeletePetButton } from "@/components/DeletePetButton";
import {
  SPECIES_LABEL,
  SEX_LABEL,
  STATUS_LABEL,
  ageFromBirthDate,
  formatDate,
} from "@/lib/utils";
import { Pencil, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 3;

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await readSession();
  if (!session) redirect("/login");

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      appointments: {
        include: { service: true, vet: { include: { user: true } } },
        orderBy: { scheduledAt: "desc" },
      },
      _count: { select: { appointments: true } },
    },
  });
  if (!pet) notFound();
  if (pet.ownerId !== session.userId) redirect("/mascotas");

  const age = ageFromBirthDate(pet.birthDate);
  const recent = pet.appointments.slice(0, RECENT_LIMIT);
  const totalAppts = pet._count.appointments;

  return (
    <AppShell>
      <PageContainer>
        <Link href="/mascotas" className="text-sm text-[var(--color-brand)] mb-3 inline-block">
          ← Mis mascotas
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <PetAvatar
            size="xl"
            photoUrl={pet.photoUrl}
            species={pet.species}
            name={pet.name}
            className="shadow-[var(--shadow-ios-md)]"
          />
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold tracking-tight truncate">{pet.name}</h1>
            <p className="text-[14px] text-[var(--color-muted)]">
              {SPECIES_LABEL[pet.species]}
              {pet.breed ? ` · ${pet.breed}` : ""}
              {age ? ` · ${age}` : ""}
            </p>
          </div>
        </div>

        <SectionTitle>Citas</SectionTitle>
        {recent.length === 0 ? (
          <EmptyState
            emoji="📅"
            title="Aún no hay citas"
            description={`Cuando agendes una visita para ${pet.name} aparecerá aquí.`}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((a) => (
              <Link key={a.id} href={`/cita/${a.id}`}>
                <Card className="hover:border-[var(--color-brand)]/30 hover:shadow-[var(--shadow-soft-md)] transition">
                  <CardBody className="flex items-center gap-3 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.service.name}</p>
                      <p className="text-[12px] text-[var(--color-muted)] truncate">
                        {formatDate(a.scheduledAt)} · {a.vet.user.name}
                      </p>
                    </div>
                    <Badge
                      variant={
                        a.status === "COMPLETED"
                          ? "success"
                          : a.status === "CANCELLED"
                          ? "danger"
                          : "brand"
                      }
                    >
                      {STATUS_LABEL[a.status]}
                    </Badge>
                  </CardBody>
                </Card>
              </Link>
            ))}
            {totalAppts > RECENT_LIMIT && (
              <Link
                href={`/mascotas/${pet.id}/citas`}
                className="flex items-center justify-center gap-1 text-[14px] font-medium text-[var(--color-brand)] py-2 hover:underline"
              >
                Ver todas las citas ({totalAppts})
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        <SectionTitle>Información</SectionTitle>
        <List>
          <ListItem>
            <span className="text-[13px] text-[var(--color-muted)] uppercase tracking-wide w-32">Sexo</span>
            <span className="font-medium">{SEX_LABEL[pet.sex]}</span>
          </ListItem>
          <ListItem>
            <span className="text-[13px] text-[var(--color-muted)] uppercase tracking-wide w-32">Peso</span>
            <span className="font-medium">{pet.weightKg ? `${pet.weightKg} kg` : "Sin registro"}</span>
          </ListItem>
          <ListItem>
            <span className="text-[13px] text-[var(--color-muted)] uppercase tracking-wide w-32">Color</span>
            <span className="font-medium">{pet.color ?? "—"}</span>
          </ListItem>
          <ListItem>
            <span className="text-[13px] text-[var(--color-muted)] uppercase tracking-wide w-32">Esterilizado</span>
            <span className="font-medium">{pet.sterilized ? "Sí" : "No"}</span>
          </ListItem>
          {pet.notes && (
            <ListItem className="flex-col items-start">
              <span className="text-[13px] text-[var(--color-muted)] uppercase tracking-wide">Notas</span>
              <p className="text-[15px] mt-1 whitespace-pre-line">{pet.notes}</p>
            </ListItem>
          )}
        </List>

        <div className="mt-8 flex flex-col gap-3">
          <Link href={`/mascotas/${pet.id}/editar`}>
            <Button size="xl" variant="secondary" className="w-full">
              <Pencil className="h-4 w-4" />
              Editar información
            </Button>
          </Link>
          <DeletePetButton id={pet.id} name={pet.name} />
        </div>
      </PageContainer>
      <ClientTabBar />
    </AppShell>
  );
}
