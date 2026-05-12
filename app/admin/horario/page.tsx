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
      <ClinicScheduleEditor days={days} />
    </div>
  );
}
