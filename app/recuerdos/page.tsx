import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PageContainer } from "@/components/ui/page";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import { PetGallery } from "@/components/PetGallery";
import { paletteFor } from "@/lib/pet-flavor";
import { PetSwitcherWithRefresh } from "./pet-switcher-with-refresh";

export const dynamic = "force-dynamic";

export default async function RecuerdosPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const pets = await prisma.pet.findMany({
    where: { ownerId: session.userId },
    include: {
      photos: { select: { id: true, url: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (pets.length === 0) {
    return (
      <ClientShellServer>
        <PageContainer className="pb-12">
          <div
            className="rounded-[24px] py-14 px-6 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-[48px] mb-3">📸</p>
            <p
              className="text-[16px] font-black mb-1"
              style={{ color: "var(--color-foreground)" }}
            >
              Aquí van a vivir los recuerdos
            </p>
            <p
              className="text-[13px] font-semibold mb-5"
              style={{ color: "var(--color-muted)" }}
            >
              Registra a tu mascota y empieza a guardar sus mejores momentos.
            </p>
            <Link
              href="/mascotas/nueva"
              className="inline-block px-5 py-3 rounded-[12px] text-white text-[14px] font-extrabold"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 65%, oklch(45% 0.12 38)))",
              }}
            >
              + Registrar mi mascota
            </Link>
          </div>
        </PageContainer>
      </ClientShellServer>
    );
  }

  const cookieStore = await cookies();
  const activeIdCookie = cookieStore.get("activePetId")?.value ?? null;
  const active = pets.find((p) => p.id === activeIdCookie) ?? pets[0];

  const switcherItems = pets.map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
    photoUrl: p.photoUrl,
    palette: paletteFor(p),
  }));

  return (
    <ClientShellServer>
      <PageContainer className="pb-12">
        <div className="flex flex-col gap-4">
          <div>
            <h1
              className="text-[24px] lg:text-[30px] font-black tracking-tight"
              style={{ color: "var(--color-foreground)" }}
            >
              📸 Recuerdos de {active.name}
            </h1>
            <p
              className="text-[13px] lg:text-[14px] font-semibold mt-1"
              style={{ color: "var(--color-muted)" }}
            >
              Cada foto es un momento de su vida contigo.
            </p>
          </div>

          {pets.length > 1 && (
            <PetSwitcherWithRefresh
              items={switcherItems}
              activeId={active.id}
            />
          )}

          <PetGallery
            petId={active.id}
            petName={active.name}
            initialPhotos={active.photos}
          />
        </div>
      </PageContainer>
    </ClientShellServer>
  );
}
