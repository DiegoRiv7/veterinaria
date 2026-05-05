import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await readSession();
  if (session) {
    if (session.role === "VET") redirect("/vet");
    if (session.role === "ADMIN") redirect("/admin");
    redirect("/inicio");
  }

  return (
    <main className="min-h-dvh flex flex-col relative z-10">
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Image
          src="/vetsfriend-logo.png"
          alt="Vetsfriend — Clínica & Grooming"
          width={320}
          height={195}
          priority
          className="w-[280px] h-auto mb-6"
        />
        <p className="mt-2 max-w-sm text-[15px] text-[var(--color-muted)] leading-relaxed">
          Agenda la cita de tu mascota en segundos. Recibe recordatorios,
          indicaciones y medicamentos siempre a la mano.
        </p>
        <div className="mt-10 flex flex-col gap-3 w-full max-w-sm">
          <Link href="/registro">
            <Button size="xl" className="w-full">
              Crear cuenta
            </Button>
          </Link>
          <Link href="/login">
            <Button size="xl" variant="secondary" className="w-full">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>
      </section>
      <footer className="p-4 text-center text-xs text-[var(--color-muted-2)]">
        Vetsfriend · Clínica &amp; Grooming
      </footer>
    </main>
  );
}
