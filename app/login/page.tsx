import Link from "next/link";
import { LoginForm } from "./login-form";
import { BrandLogo } from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex flex-col px-6 py-8 relative z-10">
      <Link href="/" className="text-sm text-[var(--color-muted)]">← Inicio</Link>
      <div className="mx-auto w-full max-w-sm flex-1 flex flex-col justify-center">
        <BrandLogo size="lg" className="mb-8" />
        <h1 className="text-[26px] font-semibold tracking-tight text-center">Bienvenido de vuelta</h1>
        <p className="mt-1.5 text-[15px] text-[var(--color-muted)] text-center">
          Entra con tu teléfono y contraseña.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-[var(--color-brand)]">
            Crear una
          </Link>
        </p>
      </div>
    </main>
  );
}
