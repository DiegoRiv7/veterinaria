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
        <div className="mb-7 h-24 w-24 rounded-[28px] bg-gradient-to-br from-[#38bdf8] via-[#6366f1] to-[#ec4899] flex items-center justify-center text-5xl shadow-[var(--shadow-glow)]">
          🐾
        </div>
        <h1 className="text-[34px] font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-[#0ea5e9] via-[#6366f1] to-[#ec4899] bg-clip-text text-transparent">
            Patitas Felices
          </span>
        </h1>
        <p className="mt-3 max-w-sm text-[15px] text-[var(--color-muted)] leading-relaxed">
          Agenda la cita de tu mascota en segundos. Recibe recordatorios, indicaciones y medicamentos
          siempre a la mano.
        </p>
        <div className="mt-10 flex flex-col gap-3 w-full max-w-sm">
          <Link href="/registro">
            <Button size="xl" className="w-full">Crear cuenta</Button>
          </Link>
          <Link href="/login">
            <Button size="xl" variant="secondary" className="w-full">Ya tengo cuenta</Button>
          </Link>
        </div>
      </section>
      <footer className="p-4 text-center text-xs text-[var(--color-muted-2)]">
        Veterinaria cercana · Atención con cariño
      </footer>
    </main>
  );
}
