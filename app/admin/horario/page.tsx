import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { DAY_LABEL } from "@/lib/utils";
import { ClinicScheduleEditor } from "@/components/admin/ClinicScheduleEditor";

export const dynamic = "force-dynamic";

export default async function HorarioPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const schedules = await prisma.clinicSchedule.findMany({
    orderBy: { dayOfWeek: "asc" },
  });
  const byDay = new Map(schedules.map((s) => [s.dayOfWeek, s]));

  // Display order: Mon → Sun
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days = order.map((d) => {
    const s = byDay.get(d);
    return {
      dayOfWeek: d,
      label: DAY_LABEL[d],
      isOpen: s?.isOpen ?? true,
      openMinutes: s?.openMinutes ?? 540,
      closeMinutes: s?.closeMinutes ?? 1080,
      slotMinutes: s?.slotMinutes ?? 30,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1
          className="text-[26px] font-black tracking-tight"
          style={{ color: "var(--vet-text-1)" }}
        >
          Horario de la clínica
        </h1>
        <p
          className="text-[13px] font-semibold"
          style={{ color: "var(--vet-text-3)" }}
        >
          Define cuándo se pueden agendar citas. Los cambios se aplican
          inmediatamente para nuevas reservas.
        </p>
      </div>
      <div
        className="border p-4 rounded-[14px] flex items-start gap-3"
        style={{
          background:
            "color-mix(in oklab, var(--vet-blue) 8%, var(--vet-bg-mid))",
          borderColor:
            "color-mix(in oklab, var(--vet-blue) 28%, var(--vet-border))",
        }}
      >
        <span
          className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 text-[14px]"
          style={{
            background: "color-mix(in oklab, var(--vet-blue) 18%, transparent)",
            color: "var(--vet-blue-dim)",
          }}
        >
          ?
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-extrabold"
            style={{ color: "var(--vet-text-1)" }}
          >
            ¿Qué es el <span className="vet-mono">slot</span>?
          </p>
          <p
            className="text-[12px] font-semibold leading-snug mt-0.5"
            style={{ color: "var(--vet-text-2)" }}
          >
            Es la duración (en minutos) de cada hueco en la agenda. Si pones{" "}
            <b>30</b>, los clientes verán huecos cada media hora (9:00,
            9:30, 10:00…). Si pones <b>60</b>, sólo verán huecos cada hora.
            Lo definís por día porque algunos días podrías querer citas más
            largas (ej. cirugías sábados con slot 60).
          </p>
        </div>
      </div>
      <ClinicScheduleEditor days={days} />
    </div>
  );
}
