import Image from "next/image";
import Link from "next/link";
import { Nunito } from "next/font/google";
import { LoginForm } from "./login-form";
import { AnimatedPetsHero } from "@/components/AnimatedPetsHero";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className={nunito.variable}>
      <main className="vet-theme min-h-dvh flex flex-col lg:flex-row">
        {/* ── Left half — animated pets hero (desktop only) ────────────── */}
        <section
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green) 0%, var(--vet-green-dim) 60%, oklch(38% 0.12 38) 100%)",
          }}
        >
          {/* Subtle noise/dot pattern overlay */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          {/* Pets animation — fills the available space */}
          <div className="absolute inset-0">
            <AnimatedPetsHero />
          </div>

          {/* Welcome copy at bottom */}
          <div className="relative z-10 flex flex-col justify-end p-12 w-full">
            <Image
              src="/vetsfriend-icon.png"
              alt="Vetsfriend"
              width={64}
              height={64}
              priority
              className="w-12 h-12 rounded-[14px] mb-5"
              style={{
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            />
            <h1 className="text-white text-[40px] font-black tracking-tight leading-[1.1]">
              Bienvenido a Vetsfriend.
            </h1>
            <p className="text-white/85 text-[16px] font-semibold mt-4 max-w-md leading-relaxed">
              La clínica veterinaria al alcance de tu mano. Agenda citas,
              consulta el historial de tu mascota y mantente conectado con
              quienes los cuidan mejor.
            </p>
          </div>
        </section>

        {/* ── Right half / mobile — login form ─────────────────────────── */}
        <section className="flex-1 lg:w-1/2 flex flex-col justify-center px-6 py-10 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <div className="flex flex-col items-center mb-6 lg:mb-8">
              <Image
                src="/vetsfriend-logo.png"
                alt="Vetsfriend — Clínica & Grooming"
                width={280}
                height={170}
                priority
                className="w-[220px] lg:w-[240px] h-auto"
              />
            </div>

            <div
              className="border p-6 lg:p-7 rounded-[22px]"
              style={{
                background:
                  "color-mix(in oklab, var(--vet-bg-card) 92%, transparent)",
                borderColor: "var(--vet-border)",
                boxShadow: "0 12px 40px oklch(50% 0.04 40 / 0.10)",
              }}
            >
              <h2
                className="text-[22px] lg:text-[24px] font-black tracking-tight"
                style={{ color: "var(--vet-text-1)" }}
              >
                Iniciar sesión
              </h2>
              <p
                className="text-[13px] font-semibold mb-5"
                style={{ color: "var(--vet-text-3)" }}
              >
                Ingresa tus credenciales para continuar.
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
        </section>
      </main>
    </div>
  );
}
