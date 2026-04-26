import Link from "next/link";
import { SignupForm } from "./signup-form";
import { BrandLogo } from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="min-h-dvh flex flex-col px-6 py-8 relative z-10">
      <Link href="/" className="text-sm text-[var(--color-muted)]">← Inicio</Link>
      <div className="mx-auto w-full max-w-sm flex-1 flex flex-col justify-center">
        <BrandLogo size="md" className="mb-6" />
        <h1 className="text-[26px] font-semibold tracking-tight text-center">Crea tu cuenta</h1>
        <p className="mt-1.5 text-[15px] text-[var(--color-muted)] text-center">
          En menos de un minuto puedes agendar tu primera cita.
        </p>
        <div className="mt-8">
          <SignupForm />
        </div>
        <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-[var(--color-brand)]">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
