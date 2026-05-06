import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { AppShell, PageContainer, PageHeader, SectionTitle } from "@/components/ui/page";
import { Card, CardBody, List, ListItem } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VetTabBar } from "@/components/VetTabBar";
import { AdminTabBar } from "@/components/AdminTabBar";
import { VetPhotoPicker } from "@/components/VetPhotoPicker";
import { ClientPhotoPicker } from "@/components/ClientPhotoPicker";
import { ClientShellServer } from "@/components/client/ClientShellServer";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    // Stale JWT (user deleted/reseeded). Cookie writes aren't allowed in
    // Server Components in Next 16; redirect to /login and let the next
    // sign-in overwrite the cookie.
    redirect("/login");
  }

  const vet =
    session.role !== "CLIENT"
      ? await prisma.veterinarian.findUnique({ where: { userId: session.userId } })
      : null;

  if (session.role === "CLIENT") {
    const petsCount = await prisma.pet.count({ where: { ownerId: session.userId } });
    const createdYear = new Date(user.createdAt).getFullYear();

    return (
      <ClientShellServer>
        <PageContainer>
          <h1
            className="text-[26px] font-black tracking-tight mb-6"
            style={{ color: "var(--color-foreground)" }}
          >
            Mi perfil
          </h1>

          {/* Avatar + photo picker */}
          <div className="flex flex-col items-center mb-7">
            <ClientPhotoPicker
              userId={user.id}
              defaultPhotoUrl={user.photoUrl}
              name={user.name}
            />
            <p
              className="text-[20px] font-black mt-3"
              style={{ color: "var(--color-foreground)" }}
            >
              {user.name}
            </p>
            <p
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-muted)" }}
            >
              Cliente desde {createdYear}
            </p>
          </div>

          {/* Info */}
          <div
            className="rounded-[20px] mb-5 overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            {[
              { label: "Teléfono", value: user.phone, icon: "📱" },
              { label: "Email", value: user.email, icon: "✉️" },
              { label: "Mascotas", value: `${petsCount} ${petsCount === 1 ? "mascota" : "mascotas"}`, icon: "🐾" },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className="flex items-center gap-3.5 px-4 py-3.5"
                style={{
                  borderBottom:
                    i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <span className="text-[20px]">{row.icon}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11px] font-extrabold uppercase tracking-wide"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {row.label}
                  </p>
                  <p
                    className="text-[14px] font-bold truncate"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {row.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Logout */}
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full py-3.5 rounded-[14px] text-[14px] font-bold transition"
              style={{
                background: "transparent",
                border: "1px solid var(--color-border)",
                color: "#c0392b",
              }}
            >
              Cerrar sesión
            </button>
          </form>
        </PageContainer>
      </ClientShellServer>
    );
  }

  // VET / ADMIN — original layout
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
                {user.role === "VET" ? "Veterinario" : "Administrador"}
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
      {session.role === "VET" && <VetTabBar />}
      {session.role === "ADMIN" && <AdminTabBar />}
    </AppShell>
  );
}
