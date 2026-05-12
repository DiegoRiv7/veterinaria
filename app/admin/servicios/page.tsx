import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { ServicesEditor } from "@/components/admin/ServicesEditor";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const services = await prisma.service.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { appointments: true } },
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1
            className="text-[26px] font-black tracking-tight"
            style={{ color: "var(--vet-text-1)" }}
          >
            Servicios
          </h1>
          <p
            className="text-[13px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            Separados en <b style={{ color: "var(--vet-green)" }}>clínicos</b>{" "}
            (consultas, vacunas, cirugías) y{" "}
            <b style={{ color: "var(--vet-blue-dim)" }}>estéticos</b> (baño,
            corte de pelo, spa). El precio final aplica el multiplicador por
            especie.
          </p>
        </div>
      </div>
      <ServicesEditor
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          basePrice: s.basePrice,
          durationMinutes: s.durationMinutes,
          active: s.active,
          category: s.category,
          appointmentCount: s._count.appointments,
        }))}
      />
    </div>
  );
}
