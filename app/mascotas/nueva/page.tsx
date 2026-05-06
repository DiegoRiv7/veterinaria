import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ClientShellServer } from "@/components/client/ClientShellServer";
import { PetForm } from "@/components/PetForm";
import { addPetAction } from "@/app/actions/appointments";

export const dynamic = "force-dynamic";

export default async function NewPetPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  return (
    <ClientShellServer>
      <PageContainer>
        <Link href="/mascotas" className="text-sm text-[var(--color-brand)] mb-3 inline-block">
          ← Volver
        </Link>
        <PageHeader title="Nueva mascota" subtitle="Cuéntanos un poco sobre ella." />
        <Card>
          <CardBody>
            <PetForm action={addPetAction} submitLabel="Agregar mascota" redirectTo="/mascotas" />
          </CardBody>
        </Card>
      </PageContainer>
    </ClientShellServer>
  );
}
