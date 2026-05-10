import { redirect } from "next/navigation";
import { Nunito, Space_Grotesk } from "next/font/google";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const user = await prisma.user
    .findUnique({
      where: { id: session.userId },
      select: { photoUrl: true },
    })
    .catch(() => null);

  return (
    <div className={`${nunito.variable} ${spaceGrotesk.variable} vet-panel`}>
      <AdminShell
        adminName={session.name}
        adminInitials={initials(session.name)}
        adminPhotoUrl={user?.photoUrl ?? null}
      >
        {children}
      </AdminShell>
    </div>
  );
}
