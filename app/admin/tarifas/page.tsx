import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { AppShell, PageContainer, PageHeader, SectionTitle } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AdminTabBar } from "@/components/AdminTabBar";
import { SPECIES_EMOJI, SPECIES_LABEL } from "@/lib/utils";
import { updateSpeciesModifierAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

const SPECIES = ["DOG", "CAT", "BIRD", "RABBIT", "HAMSTER", "REPTILE", "OTHER"] as const;

export default async function TarifasPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const mods = await prisma.speciesPriceModifier.findMany();
  const map = Object.fromEntries(mods.map((m) => [m.species, m.multiplier]));

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Tarifas por especie"
          subtitle="Multiplicador aplicado al precio base del servicio."
        />
        <SectionTitle>Multiplicadores</SectionTitle>
        <div className="flex flex-col gap-3">
          {SPECIES.map((s) => {
            const current = map[s] ?? 1;
            return (
              <Card key={s}>
                <CardBody>
                  <form action={updateSpeciesModifierAction} className="flex items-center gap-3">
                    <input type="hidden" name="species" value={s} />
                    <div className="h-11 w-11 rounded-[14px] bg-[var(--color-brand-soft)] flex items-center justify-center text-2xl shrink-0">
                      {SPECIES_EMOJI[s]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{SPECIES_LABEL[s]}</p>
                      <p className="text-[12px] text-[var(--color-muted)]">
                        Ej. 1.0 = precio base, 1.2 = +20%
                      </p>
                    </div>
                    <div className="w-24">
                      <Label className="sr-only">Multiplicador</Label>
                      <Input
                        name="multiplier"
                        type="number"
                        min="0.1"
                        step="0.05"
                        defaultValue={current}
                        className="text-center"
                      />
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
