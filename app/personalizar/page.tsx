import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PageContainer } from "@/components/ui/page";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import {
  paletteForStyle,
  parsePersonalityTags,
  personalityFor,
  funFactFor,
  moodFor,
} from "@/lib/pet-flavor";
import { PersonalizarClient, type PersonalizarPayload } from "./personalizar-client";

export const dynamic = "force-dynamic";

export default async function PersonalizarPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const activeIdCookie = cookieStore.get("activePetId")?.value ?? null;

  const pet = await prisma.pet.findFirst({
    where: {
      ownerId: session.userId,
      ...(activeIdCookie ? { id: activeIdCookie } : {}),
    },
    include: {
      photos: {
        select: { id: true, url: true },
        orderBy: { createdAt: "desc" },
      },
      vaccines: { select: { nextAt: true } },
      appointments: {
        where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!pet) {
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
            <p className="text-[48px] mb-3">✨</p>
            <p
              className="text-[16px] font-black mb-1"
              style={{ color: "var(--color-foreground)" }}
            >
              Sin mascota seleccionada
            </p>
            <Link
              href="/mascotas/nueva"
              className="inline-block mt-4 px-5 py-3 rounded-[12px] text-white text-[14px] font-extrabold"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 65%, oklch(45% 0.12 38)))",
              }}
            >
              + Registrar mascota
            </Link>
          </div>
        </PageContainer>
      </ClientShellServer>
    );
  }

  const palette = paletteForStyle(pet);
  const galleryUrls = [
    pet.photoUrl,
    ...pet.photos.slice(0, 5).map((ph) => ph.url),
  ].filter((u): u is string => !!u);

  const defaultPersonality = personalityFor(pet.species);
  const savedTags = parsePersonalityTags(pet.personalityTags);
  const now = Date.now();
  const defaultMood = moodFor({
    species: pet.species,
    hasUpcoming: pet.appointments.length > 0,
    hasPendingVaccine: pet.vaccines.some(
      (v) => v.nextAt && v.nextAt.getTime() < now
    ),
  });

  const payload: PersonalizarPayload = {
    pet: {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      photoUrl: pet.photoUrl,
      cardStyle: pet.cardStyle ?? null,
    },
    galleryUrls,
    initialPhotos: pet.photos,
    defaultMood,
    defaultPersonality,
    defaultFunFact: funFactFor(pet),
    savedPersonalityTags: savedTags,
    customMood: pet.customMood ?? null,
    customFunFact: pet.customFunFact ?? null,
    paletteAccent: palette.accent,
  };

  return (
    <ClientShellServer>
      <PageContainer className="pb-12">
        <div className="flex flex-col gap-1.5 mb-2 px-1">
          <p
            className="text-[11px] font-extrabold uppercase tracking-[1.5px]"
            style={{ color: "var(--color-muted)" }}
          >
            PERSONALIZAR
          </p>
          <h1
            className="text-[26px] lg:text-[32px] font-black tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            {pet.name}
          </h1>
        </div>
        <PersonalizarClient payload={payload} />
      </PageContainer>
    </ClientShellServer>
  );
}
