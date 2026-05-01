import Link from "next/link";
import { Nunito } from "next/font/google";
import { SignupForm } from "./signup-form";
import { VetIcon } from "@/components/vet/VetIcon";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export const dynamic = "force-dynamic";

export default function SignupPage() {
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
        <div className="mx-auto w-full max-w-sm flex-1 flex flex-col justify-center py-6">
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-3"
              style={{
                background:
                  "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
                boxShadow: "0 12px 32px var(--vet-green-glow)",
              }}
            >
              <VetIcon name="paw" size={26} color="white" />
            </div>
            <div
              className="text-[22px] font-black tracking-tight"
              style={{ color: "var(--vet-text-1)" }}
            >
              Patitas Felices
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
              Crea tu cuenta
            </h1>
            <p
              className="text-[13px] font-semibold mb-5"
              style={{ color: "var(--vet-text-3)" }}
            >
              En menos de un minuto puedes agendar tu primera cita.
            </p>
            <SignupForm />
          </div>

          <p
            className="mt-6 text-center text-[13px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-extrabold no-underline"
              style={{ color: "var(--vet-green)" }}
            >
              Entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
