import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader, SectionTitle } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { AdminTabBar } from "@/components/AdminTabBar";
import { formatCurrency } from "@/lib/utils";
import {
  deleteServiceAction,
  upsertServiceAction,
} from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const services = await prisma.service.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Servicios" subtitle="Los servicios y precios base." />

        <SectionTitle>Existentes</SectionTitle>
        <div className="flex flex-col gap-3">
          {services.map((s) => (
            <Card key={s.id}>
              <CardBody>
                <form action={upsertServiceAction} className="flex flex-col gap-3">
                  <input type="hidden" name="id" value={s.id} />
                  <div>
                    <Label>Nombre</Label>
                    <Input name="name" defaultValue={s.name} required />
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Textarea name="description" defaultValue={s.description ?? ""} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Precio base (MXN)</Label>
                      <Input name="basePrice" type="number" min="0" step="1" defaultValue={s.basePrice} />
                    </div>
                    <div>
                      <Label>Duración (min)</Label>
                      <Input name="durationMinutes" type="number" min="5" step="5" defaultValue={s.durationMinutes} />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 p-3 rounded-[12px] bg-[var(--color-surface-2)]">
                    <input type="checkbox" name="active" defaultChecked={s.active} className="h-5 w-5" />
                    <span>Activo (visible para clientes)</span>
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit" size="md">Guardar</Button>
                    <span className="text-[13px] text-[var(--color-muted)] self-center">
                      Actual: {formatCurrency(s.basePrice)}
                    </span>
                  </div>
                </form>
                <form action={deleteServiceAction} className="mt-2 border-t border-[var(--color-border)] pt-3">
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-[var(--color-danger)]">
                    Eliminar / archivar
                  </Button>
                </form>
              </CardBody>
            </Card>
          ))}
        </div>

        <SectionTitle>Agregar servicio</SectionTitle>
        <Card>
          <CardBody>
            <form action={upsertServiceAction} className="flex flex-col gap-3">
              <div>
                <Label>Nombre</Label>
                <Input name="name" required placeholder="Ej. Limpieza dental" />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea name="description" placeholder="Breve descripción que verá el cliente" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Precio base (MXN)</Label>
                  <Input name="basePrice" type="number" min="0" step="1" required placeholder="500" />
                </div>
                <div>
                  <Label>Duración (min)</Label>
                  <Input name="durationMinutes" type="number" min="5" step="5" defaultValue={30} required />
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-[12px] bg-[var(--color-surface-2)]">
                <input type="checkbox" name="active" defaultChecked className="h-5 w-5" />
                <span>Activo</span>
              </label>
              <Button type="submit" size="lg">Crear servicio</Button>
            </form>
          </CardBody>
        </Card>
      </PageContainer>
      <AdminTabBar />
    </AppShell>
  );
}
