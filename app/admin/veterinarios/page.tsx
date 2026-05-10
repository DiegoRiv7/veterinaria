import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { ChevronRight, Plus } from "lucide-react";
import { VetAvatar } from "@/components/VetAvatar";
import { CreateVetForm } from "@/components/admin/CreateVetForm";

export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function VetsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const monthStart = startOfMonth();

  const vets = await prisma.veterinarian.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      _count: { select: { appointments: true } },
      appointments: {
        where: {
          status: "COMPLETED",
          scheduledAt: { gte: monthStart },
        },
        select: { id: true, priceEstimate: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1
            className="text-[26px] font-black tracking-tight"
            style={{ color: "var(--vet-text-1)" }}
          >
            Veterinarios
          </h1>
          <p
            className="text-[13px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            {vets.length} doctor{vets.length === 1 ? "" : "es"} en el equipo. Tap
            sobre uno para editar datos, agenda y resetear contraseña.
          </p>
        </div>
      </div>

      {/* List */}
      {vets.length === 0 ? (
        <div
          className="border-dashed border p-10 rounded-[18px] flex flex-col items-center gap-3 text-center"
          style={{
            borderColor: "var(--vet-border)",
            background: "var(--vet-bg-mid)",
          }}
        >
          <div className="text-3xl">🩺</div>
          <p
            className="text-[14px] font-extrabold"
            style={{ color: "var(--vet-text-1)" }}
          >
            Aún no hay veterinarios
          </p>
          <p
            className="text-[12px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            Agrega al primer doctor con el formulario de abajo.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 grid-cols-1 lg:grid-cols-2">
          {vets.map((v) => {
            const monthRevenue = v.appointments.reduce(
              (acc, a) => acc + a.priceEstimate,
              0
            );
            return (
              <Link
                key={v.id}
                href={`/admin/veterinarios/${v.id}`}
                className="border p-4 rounded-[16px] flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:[border-color:var(--vet-green)] no-underline"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-1)",
                }}
              >
                <VetAvatar
                  photoUrl={v.photoUrl}
                  name={v.user.name}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[15px] font-extrabold truncate"
                    style={{ color: "var(--vet-text-1)" }}
                  >
                    {v.user.name}
                  </p>
                  <p
                    className="text-[12px] font-semibold truncate"
                    style={{ color: "var(--vet-text-3)" }}
                  >
                    {v.user.email}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span
                      className="vet-mono text-[11px] font-extrabold px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--vet-green-glow)",
                        color: "var(--vet-green)",
                      }}
                    >
                      {v._count.appointments} citas total
                    </span>
                    <span
                      className="vet-mono text-[11px] font-extrabold px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--vet-blue-glow)",
                        color: "var(--vet-blue-dim)",
                      }}
                    >
                      {v.appointments.length} este mes
                    </span>
                    {monthRevenue > 0 && (
                      <span
                        className="vet-mono text-[11px] font-extrabold px-2 py-0.5 rounded-full"
                        style={{
                          background:
                            "color-mix(in oklab, var(--vet-violet) 14%, transparent)",
                          color: "var(--vet-violet)",
                        }}
                      >
                        ${Math.round(monthRevenue).toLocaleString("es-MX")}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} color="var(--vet-text-3)" />
              </Link>
            );
          })}
        </div>
      )}

      {/* Create form */}
      <div className="mt-2">
        <p
          className="text-[11px] font-extrabold uppercase tracking-[1px] mb-2 px-1 inline-flex items-center gap-1.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          <Plus size={12} /> Nuevo veterinario
        </p>
        <CreateVetForm />
      </div>
    </div>
  );
}
