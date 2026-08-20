import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
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
    // Stale JWT (e.g. user was deleted/reseeded). The next /login submission
    // overwrites the cookie automatically; we can't clearSessionCookie() from
    // a Server Component (cookie writes only allowed in Server Actions / Route
    // Handlers in Next.js 16).
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
              licenseNumber: user.vetProfile.licenseNumber,
              photoUrl: user.vetProfile.photoUrl,
            }
          : null
      }
    />
  );
}
