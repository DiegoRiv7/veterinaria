import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { PageContainer } from "@/components/ui/page";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import {
  SPECIES_LABEL,
  SPECIES_EMOJI,
  ageFromBirthDate,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const PET_RING_COLORS = [
  "#e8a061",
  "#b48cd9",
  "#a8d8a8",
  "#f0c95e",
  "#f4a472",
  "#9bb8d9",
];

export default async function PetsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const pets = await prisma.pet.findMany({
    where: { ownerId: session.userId },
    include: {
      appointments: {
        where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
        select: { id: true, scheduledAt: true, service: { select: { name: true } } },
        orderBy: { scheduledAt: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <ClientShellServer>
      <PageContainer>
        <h1
          className="text-[26px] font-black tracking-tight mb-5"
          style={{ color: "var(--color-foreground)" }}
        >
          Mis mascotas
        </h1>

        {pets.length === 0 ? (
          <div
            className="rounded-[20px] py-16 px-6 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-[42px] mb-3">🐶</p>
            <p className="text-[15px] font-bold mb-1" style={{ color: "var(--color-foreground)" }}>
              Aún no tienes mascotas registradas
            </p>
            <p className="text-[13px] font-semibold mb-5" style={{ color: "var(--color-muted)" }}>
              Agrega a tu peludito para empezar a agendar visitas.
            </p>
            <Link
              href="/mascotas/nueva"
              className="inline-block px-5 py-3 rounded-[12px] text-[14px] font-extrabold text-white"
              style={{
                background: "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 70%, oklch(45% 0.12 38)))",
              }}
            >
              + Agregar mi primera mascota
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {pets.map((p, i) => {
              const ring = PET_RING_COLORS[i % PET_RING_COLORS.length];
              const age = ageFromBirthDate(p.birthDate);
              const sub = [SPECIES_LABEL[p.species], p.breed, age, p.weightKg ? `${p.weightKg} kg` : null]
                .filter(Boolean)
                .join(" · ");
              const nextAppt = p.appointments[0];
              return (
                <Link key={p.id} href={`/mascotas/${p.id}`} className="block">
                  <div
                    className="flex items-center gap-4 p-4 rounded-[20px] hover:brightness-[1.02] transition"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      className="rounded-full flex items-center justify-center text-[28px] shrink-0"
                      style={{
                        width: 60,
                        height: 60,
                        background: `${ring}28`,
                        border: `2.5px solid ${ring}55`,
                      }}
                    >
                      {SPECIES_EMOJI[p.species] || "🐾"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[17px] font-black truncate"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {p.name}
                      </p>
                      <p
                        className="text-[12px] font-semibold truncate"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {sub}
                      </p>
                      <p className="text-[12px] font-semibold mt-1">
                        {nextAppt ? (
                          <span style={{ color: "var(--color-brand)" }}>
                            📅 Próxima: {nextAppt.service.name}
                          </span>
                        ) : (
                          <span style={{ color: "var(--vet-green, #2f7d4f)" }}>
                            ✓ Sin citas pendientes
                          </span>
                        )}
                      </p>
                    </div>
                    <span style={{ color: "var(--color-muted)", fontSize: 18 }}>›</span>
                  </div>
                </Link>
              );
            })}
            <Link
              href="/mascotas/nueva"
              className="block py-4 rounded-[20px] text-center text-[15px] font-bold"
              style={{
                background: "transparent",
                border: "1.5px dashed var(--color-border)",
                color: "var(--color-muted)",
              }}
            >
              + Agregar mascota
            </Link>
          </div>
        )}
      </PageContainer>
    </ClientShellServer>
  );
}
