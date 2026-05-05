import Image from "next/image";
import Link from "next/link";
import { Nunito } from "next/font/google";
import { LoginForm } from "./login-form";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className={`${nunito.variable}`}>
      <main className="vet-theme min-h-dvh flex flex-col px-6 py-8">
        <div className="mx-auto w-full max-w-sm flex-1 flex flex-col justify-center">
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/vetsfriend-logo.png"
              alt="Vetsfriend — Clínica & Grooming"
              width={280}
              height={170}
              priority
              className="w-[260px] h-auto"
            />
          </div>

          <div
            className="border p-6 rounded-[22px]"
            style={{
              background:
                "color-mix(in oklab, var(--vet-bg-card) 92%, transparent)",
              borderColor: "var(--vet-border)",
              boxShadow: "0 12px 40px oklch(50% 0.04 240 / 0.08)",
            }}
          >
            <h1
              className="text-[22px] font-black tracking-tight"
              style={{ color: "var(--vet-text-1)" }}
            >
              Bienvenido de vuelta
            </h1>
            <p
              className="text-[13px] font-semibold mb-5"
              style={{ color: "var(--vet-text-3)" }}
            >
              Entra con tu correo y contraseña.
            </p>
            <LoginForm />
          </div>

          <p
            className="mt-6 text-center text-[13px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            ¿Aún no tienes cuenta?{" "}
            <Link
              href="/registro"
              className="font-extrabold no-underline"
              style={{ color: "var(--vet-green)" }}
            >
              Crear una
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
