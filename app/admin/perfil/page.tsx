import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AdminProfileEditor } from "@/components/admin/AdminProfileEditor";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user) redirect("/login");

  return (
    <AdminProfileEditor
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        photoUrl: user.photoUrl,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
