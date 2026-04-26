import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader, SectionTitle } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientTabBar } from "@/components/ClientTabBar";
import { EmptyState } from "@/components/EmptyState";
import { PetAvatar } from "@/components/PetAvatar";
import {
  SPECIES_LABEL,
  SEX_LABEL,
  ageFromBirthDate,
} from "@/lib/utils";
import { ChevronRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PetsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const pets = await prisma.pet.findMany({
    where: { ownerId: session.userId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Mis mascotas"
          subtitle="Todas las peluditas que cuidas."
          right={
            <Link href="/mascotas/nueva">
              <Button size="md">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </Link>
          }
        />

        {pets.length === 0 ? (
          <EmptyState
            emoji="🐶"
            title="Aún no tienes mascotas registradas"
            description="Agrega a tu peludito para empezar a agendar visitas."
            action={
              <Link href="/mascotas/nueva">
                <Button>Agregar mi primera mascota</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3">
            {pets.map((p) => {
              const age = ageFromBirthDate(p.birthDate);
              const subParts = [
                SPECIES_LABEL[p.species],
                p.breed,
                age,
                p.weightKg ? `${p.weightKg} kg` : null,
                p.sex !== "UNKNOWN" ? SEX_LABEL[p.sex] : null,
              ].filter(Boolean);
              return (
                <Link key={p.id} href={`/mascotas/${p.id}`}>
                  <Card className="hover:border-[var(--color-brand)]/40 hover:shadow-[var(--shadow-ios-md)] transition">
                    <CardBody className="flex items-center gap-4">
                      <PetAvatar
                        size="md"
                        photoUrl={p.photoUrl}
                        species={p.species}
                        name={p.name}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[17px] truncate">{p.name}</p>
                        <p className="text-[13px] text-[var(--color-muted)] truncate">
                          {subParts.join(" · ")}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[var(--color-muted-2)]" />
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </PageContainer>
      <ClientTabBar />
    </AppShell>
  );
}
