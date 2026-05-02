import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { clearSessionCookie, readSession } from "@/lib/auth";
import { VetProfileEditor } from "@/components/vet/VetProfileEditor";

export const dynamic = "force-dynamic";

export default async function VetProfilePage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { vetProfile: true },
  });
  if (!user) {
    // Stale JWT (e.g. user was deleted/reseeded). Clear cookie and re-login.
    await clearSessionCookie();
    redirect("/login");
  }

  const roleLabel =
    user.role === "VET" ? "Veterinario" : user.role === "ADMIN" ? "Administrador" : "Cliente";

  return (
    <VetProfileEditor
      user={{
        name: user.name,
        email: user.email,
        phone: user.phone,
        roleLabel,
      }}
      vet={
        user.vetProfile
          ? {
              id: user.vetProfile.id,
              bio: user.vetProfile.bio,
              photoUrl: user.vetProfile.photoUrl,
            }
          : null
      }
    />
  );
}
