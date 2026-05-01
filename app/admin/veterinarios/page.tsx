import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader, SectionTitle } from "@/components/ui/page";
import { Card, CardBody, List, ListItem } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { AdminTabBar } from "@/components/AdminTabBar";
import { EmptyState } from "@/components/EmptyState";
import { VetAvatar } from "@/components/VetAvatar";
import { addVetAction, removeVetAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function VetsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const vets = await prisma.veterinarian.findMany({
    include: { user: true, _count: { select: { appointments: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Veterinarios"
          subtitle="Los doctores que atienden en la clínica."
        />

        <SectionTitle>Actuales</SectionTitle>
        {vets.length === 0 ? (
          <EmptyState
            emoji="🩺"
            title="Aún no hay veterinarios"
            description="Agrega al primer doctor para que pueda atender citas."
          />
        ) : (
          <List>
            {vets.map((v) => (
              <ListItem key={v.id} className="flex-col items-stretch gap-2">
                <div className="flex items-center gap-3">
                  <VetAvatar photoUrl={v.photoUrl} name={v.user.name} size="md" />
                  <div className="flex-1">
                    <p className="font-medium">{v.user.name}</p>
                    <p className="text-[13px] text-[var(--color-muted)]">
                      {v.user.email} · {v._count.appointments} citas
                    </p>
                  </div>
                  <form action={removeVetAction}>
                    <input type="hidden" name="id" value={v.id} />
                    <Button size="sm" variant="ghost" className="text-[var(--color-danger)]" type="submit">
                      Eliminar
                    </Button>
                  </form>
                </div>
                {v.bio && <p className="text-[13px] text-[var(--color-muted)]">{v.bio}</p>}
              </ListItem>
            ))}
          </List>
        )}

        <SectionTitle>Agregar veterinario</SectionTitle>
        <Card>
          <CardBody>
            <form action={addVetAction} className="flex flex-col gap-3">
              <div>
                <Label>Nombre completo</Label>
                <Input name="name" required placeholder="Ej. Dra. Ana Pérez" />
              </div>
              <div>
                <Label>Correo electrónico (login)</Label>
                <Input name="email" type="email" required placeholder="ana@patitasfelices.com" />
              </div>
              <div>
                <Label>Teléfono (contacto)</Label>
                <Input name="phone" required inputMode="numeric" placeholder="10 dígitos" />
              </div>
              <div>
                <Label>Contraseña temporal</Label>
                <Input name="password" required minLength={4} placeholder="Mínimo 4 caracteres" />
              </div>
              <div>
                <Label>Bio / especialidad</Label>
                <Textarea name="bio" placeholder="Ej. Cirujano de pequeñas especies." />
              </div>
              <Button type="submit" size="lg">Crear veterinario</Button>
            </form>
          </CardBody>
        </Card>
      </PageContainer>
      <AdminTabBar />
    </AppShell>
  );
}
