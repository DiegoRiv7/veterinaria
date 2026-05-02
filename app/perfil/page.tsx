import { redirect } from "next/navigation";
import { clearSessionCookie, readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { AppShell, PageContainer, PageHeader, SectionTitle } from "@/components/ui/page";
import { Card, CardBody, List, ListItem } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientTabBar } from "@/components/ClientTabBar";
import { VetTabBar } from "@/components/VetTabBar";
import { AdminTabBar } from "@/components/AdminTabBar";
import { VetPhotoPicker } from "@/components/VetPhotoPicker";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    // Stale JWT (user deleted/reseeded). Clear cookie and re-login.
    await clearSessionCookie();
    redirect("/login");
  }

  const vet =
    session.role !== "CLIENT"
      ? await prisma.veterinarian.findUnique({ where: { userId: session.userId } })
      : null;

  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Mi perfil" />

        {vet && (
          <>
            <SectionTitle>Mi foto</SectionTitle>
            <Card>
              <CardBody>
                <VetPhotoPicker
                  vetId={vet.id}
                  defaultPhotoUrl={vet.photoUrl}
                  name={user.name}
                />
              </CardBody>
            </Card>
          </>
        )}

        <SectionTitle>Cuenta</SectionTitle>
        <List>
          <ListItem>
            <div className="flex-1">
              <p className="text-[13px] text-[var(--color-muted)]">Nombre</p>
              <p className="font-medium">{user.name}</p>
            </div>
          </ListItem>
          <ListItem>
            <div className="flex-1">
              <p className="text-[13px] text-[var(--color-muted)]">Teléfono</p>
              <p className="font-medium">{user.phone}</p>
            </div>
          </ListItem>
          <ListItem>
            <div className="flex-1">
              <p className="text-[13px] text-[var(--color-muted)]">Rol</p>
              <p className="font-medium">
                {user.role === "CLIENT" ? "Cliente" : user.role === "VET" ? "Veterinario" : "Administrador"}
              </p>
            </div>
          </ListItem>
        </List>

        <form action={logoutAction} className="mt-8">
          <Button variant="danger" size="xl" className="w-full" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </PageContainer>
      {session.role === "CLIENT" && <ClientTabBar />}
      {session.role === "VET" && <VetTabBar />}
      {session.role === "ADMIN" && <AdminTabBar />}
    </AppShell>
  );
}
