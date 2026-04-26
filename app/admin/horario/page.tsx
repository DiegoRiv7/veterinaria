import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader, SectionTitle } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AdminTabBar } from "@/components/AdminTabBar";
import { DAY_LABEL } from "@/lib/utils";
import { updateScheduleAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

function minutesToHHMM(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export default async function HorarioPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const schedules = await prisma.clinicSchedule.findMany({ orderBy: { dayOfWeek: "asc" } });
  const byDay = new Map(schedules.map((s) => [s.dayOfWeek, s]));

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Horario de la clínica"
          subtitle="Define cuándo se pueden agendar citas."
        />
        <SectionTitle>Por día de la semana</SectionTitle>
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const s = byDay.get(day);
            return (
              <Card key={day}>
                <CardBody>
                  <form action={updateScheduleAction} className="flex flex-col gap-3">
                    <input type="hidden" name="dayOfWeek" value={day} />
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{DAY_LABEL[day]}</p>
                      <label className="flex items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          name="isOpen"
                          defaultChecked={s?.isOpen ?? true}
                          className="h-5 w-5"
                        />
                        Abierto
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label>Abre</Label>
                        <Input
                          name="openTime"
                          type="time"
                          defaultValue={minutesToHHMM(s?.openMinutes ?? 540)}
                        />
                      </div>
                      <div>
                        <Label>Cierra</Label>
                        <Input
                          name="closeTime"
                          type="time"
                          defaultValue={minutesToHHMM(s?.closeMinutes ?? 1080)}
                        />
                      </div>
                      <div>
                        <Label>Slot (min)</Label>
                        <Input
                          name="slotMinutes"
                          type="number"
                          min="10"
                          step="5"
                          defaultValue={s?.slotMinutes ?? 30}
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm">Guardar</Button>
                  </form>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </PageContainer>
      <AdminTabBar />
    </AppShell>
  );
}
