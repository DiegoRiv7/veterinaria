import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { VetIcon } from "@/components/vet/VetIcon";

export const dynamic = "force-dynamic";

function formatShortDate(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(d);
}

function categoryFor(serviceName: string): string {
  const n = serviceName.toLowerCase();
  if (n.includes("vacun")) return "Vacunación";
  if (n.includes("desparasit")) return "Desparasitación";
  if (n.includes("operac") || n.includes("cirug") || n.includes("ester")) return "Cirugía";
  if (n.includes("urgenc")) return "Urgencia";
  if (n.includes("estét") || n.includes("estet") || n.includes("baño") || n.includes("bano")) return "Estética";
  return "Consulta";
}

export default async function VetRecordsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const vetProfile = await prisma.veterinarian.findUnique({ where: { userId: session.userId } });
  const vetFilter = vetProfile ? { vetId: vetProfile.id } : {};

  const records = await prisma.appointment.findMany({
    where: {
      ...vetFilter,
      status: "COMPLETED",
    },
    include: {
      pet: { select: { name: true } },
      service: { select: { name: true } },
      vet: { include: { user: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-black tracking-tight" style={{ color: "var(--vet-text-1)" }}>
          Historial Clínico
        </h2>
        <div className="text-[13px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
          {records.length === 0
            ? "Sin registros aún"
            : `${records.length} ${records.length === 1 ? "registro reciente" : "registros recientes"}`}
        </div>
      </div>

      {records.length === 0 ? (
        <div
          className="py-14 text-center border"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            borderRadius: 22,
            color: "var(--vet-text-3)",
          }}
        >
          <div className="text-[40px] mb-2">📋</div>
          <div className="text-[14px] font-bold" style={{ color: "var(--vet-text-2)" }}>
            Aún no hay citas completadas
          </div>
          <div className="text-[12px] font-semibold mt-1">
            Cuando marques una cita como completada aparecerá aquí.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {records.map((r) => {
            const category = categoryFor(r.service.name);
            const notes = r.vetNotes ?? r.instructions ?? "Sin notas registradas.";
            return (
              <Link
                key={r.id}
                href={`/vet/cita/${r.id}`}
                className="flex items-start gap-4 px-5 py-4 border no-underline transition-colors"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  borderRadius: 14,
                  color: "var(--vet-text-1)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--vet-green-glow)" }}
                >
                  <VetIcon name="records" size={18} color="var(--vet-green)" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <span className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
                      {r.pet.name}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-extrabold"
                      style={{
                        background: "var(--vet-green-glow)",
                        color: "var(--vet-green)",
                      }}
                    >
                      {category}
                    </span>
                    <span
                      className="ml-auto text-[12px] font-semibold whitespace-nowrap"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      {formatShortDate(r.scheduledAt)}
                    </span>
                  </div>
                  <div className="text-[13px] leading-snug font-semibold line-clamp-2" style={{ color: "var(--vet-text-2)" }}>
                    {notes}
                  </div>
                  <div className="text-[11px] font-semibold mt-1" style={{ color: "var(--vet-text-3)" }}>
                    Atendido por: {r.vet.user.name}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
