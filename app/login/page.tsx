import Link from "next/link";
import { Nunito } from "next/font/google";
import { LoginForm } from "./login-form";
import { VetIcon } from "@/components/vet/VetIcon";

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
        <Link
          href="/"
          className="text-[13px] font-semibold no-underline self-start"
          style={{ color: "var(--vet-text-3)" }}
        >
          ← Inicio
        </Link>
        <div className="mx-auto w-full max-w-sm flex-1 flex flex-col justify-center">
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-[18px] flex items-center justify-center mb-4"
              style={{
                background:
                  "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
                boxShadow: "0 12px 32px var(--vet-green-glow)",
              }}
            >
              <VetIcon name="paw" size={30} color="white" />
            </div>
            <div
              className="text-[24px] font-black tracking-tight"
              style={{ color: "var(--vet-text-1)" }}
            >
              Patitas Felices
            </div>
            <div
              className="text-[11px] font-extrabold uppercase tracking-wider mt-0.5"
              style={{ color: "var(--vet-text-3)" }}
            >
              Veterinaria · Pro Panel
            </div>
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
