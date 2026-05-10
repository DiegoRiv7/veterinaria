import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PageContainer } from "@/components/ui/page";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import { PetdexHomeClient, type PetdexPet } from "./petdex-home-client";
import { ageFromBirthDate, formatTime } from "@/lib/utils";
import {
  paletteForStyle,
  isTransparentStyle,
  personalityForPet,
  funFactFor,
  bgEmojisFor,
  moodFor,
} from "@/lib/pet-flavor";

export const dynamic = "force-dynamic";

function dateLabel(d: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, today)) return "Hoy";
  if (same(d, tomorrow)) return "Mañana";
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export default async function ClientHome() {
  const session = await readSession();
  if (!session) redirect("/login");

  const [petsRaw] = await Promise.all([
    prisma.pet.findMany({
      where: { ownerId: session.userId },
      include: {
        photos: { select: { id: true, url: true }, orderBy: { createdAt: "desc" } },
        vaccines: {
          select: { nextAt: true },
        },
        appointments: {
          where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
          include: {
            service: { select: { name: true } },
            vet: { include: { user: { select: { name: true } } } },
          },
          orderBy: { scheduledAt: "asc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const cookieStore = await cookies();
  const activeIdCookie = cookieStore.get("activePetId")?.value ?? null;

  // Empty state — no pets at all
  if (petsRaw.length === 0) {
    return (
      <ClientShellServer>
        <PageContainer className="pb-12">
          <div
            className="rounded-[24px] py-14 px-6 text-center"
            style={{
              background:
                "linear-gradient(145deg, color-mix(in oklab, var(--color-brand) 14%, var(--color-surface)), var(--color-surface))",
              border: "1.5px solid var(--color-border)",
            }}
          >
            <p className="text-[60px] mb-4">🐾</p>
            <h1
              className="text-[24px] font-black mb-2"
              style={{ color: "var(--color-foreground)" }}
            >
              Bienvenido a Vetsfriend
            </h1>
            <p
              className="text-[14px] font-semibold mb-6"
              style={{ color: "var(--color-muted)" }}
            >
              Aquí va a vivir la historia de tu mejor amigo. Empezamos por su
              perfil.
            </p>
            <Link
              href="/mascotas/nueva"
              className="inline-block px-6 py-3 rounded-[14px] text-white text-[14px] font-extrabold"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 65%, oklch(45% 0.12 38)))",
                boxShadow:
                  "0 12px 28px color-mix(in oklab, var(--color-brand) 32%, transparent)",
              }}
            >
              + Registrar mi mascota
            </Link>
          </div>
        </PageContainer>
      </ClientShellServer>
    );
  }

  // Build PetdexPet shape with computed flavor
  const now = Date.now();
  const SOON_DAYS = 60;
  const pets: PetdexPet[] = petsRaw.map((p) => {
    const palette = paletteForStyle(p);
    const transparent = isTransparentStyle(p.cardStyle);
    const next = p.appointments[0];
    const hasUpcoming = !!next;
    const hasPendingVaccine = p.vaccines.some(
      (v) =>
        v.nextAt &&
        v.nextAt.getTime() >= now &&
        (v.nextAt.getTime() - now) / 86400000 <= SOON_DAYS
    );
    const hasOverdueVaccine = p.vaccines.some(
      (v) => v.nextAt && v.nextAt.getTime() < now
    );

    let status = "Saludable";
    let statusOk = true;
    if (hasOverdueVaccine) {
      status = "Vacuna vencida";
      statusOk = false;
    } else if (hasPendingVaccine) {
      status = "Vacuna próxima";
      statusOk = false;
    }

    const galleryUrls = [
      p.photoUrl,
      ...p.photos.slice(0, 5).map((ph) => ph.url),
    ].filter((u): u is string => !!u);

    const milestones: { icon: string; label: string; value: string }[] = [];
    if (p.birthDate) {
      milestones.push({
        icon: "🎂",
        label: "Cumpleaños",
        value: new Intl.DateTimeFormat("es-MX", {
          day: "numeric",
          month: "short",
        }).format(p.birthDate),
      });
    }
    milestones.push({
      icon: "🏠",
      label: "Llegó a casa",
      value: new Intl.DateTimeFormat("es-MX", {
        month: "short",
        year: "numeric",
      }).format(p.createdAt),
    });
    if (p.sterilized) {
      milestones.push({ icon: "✂️", label: "Esterilizado", value: "Sí" });
    }
    if (p.vaccines.length > 0) {
      milestones.push({
        icon: "💉",
        label: "Vacunas",
        value: `${p.vaccines.length}`,
      });
    }

    const ageStr = ageFromBirthDate(p.birthDate) ?? "—";

    const autoMood = moodFor({
      species: p.species,
      hasUpcoming,
      hasPendingVaccine: hasPendingVaccine || hasOverdueVaccine,
    });

    return {
      id: p.id,
      name: p.name,
      species: p.species,
      breed: p.breed,
      photoUrl: p.photoUrl,
      galleryUrls,
      bgEmojis: bgEmojisFor(p.species),
      mood: p.customMood ?? autoMood,
      personality: personalityForPet({
        species: p.species,
        personalityTags: p.personalityTags,
      }),
      funFact: p.customFunFact ?? funFactFor(p),
      status,
      statusOk,
      palette,
      transparent,
      age: ageStr,
      weight: p.weightKg ? `${p.weightKg} kg` : "—",
      vaccinesAllOk: !hasPendingVaccine && !hasOverdueVaccine,
      milestones,
      lastVisitLabel: null,
      nextAppt: next
        ? {
            id: next.id,
            reason: next.service.name,
            dateLabel: dateLabel(next.scheduledAt),
            timeLabel: formatTime(next.scheduledAt),
            vetName: next.vet.user.name,
          }
        : null,
    };
  });

  const initialActiveId =
    pets.find((p) => p.id === activeIdCookie)?.id ?? pets[0].id;

  return (
    <ClientShellServer>
      <PageContainer className="pb-12">
        <PetdexHomeClient pets={pets} initialActiveId={initialActiveId} />
      </PageContainer>
    </ClientShellServer>
  );
}
