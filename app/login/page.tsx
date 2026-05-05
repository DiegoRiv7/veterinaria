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
      <main className="vet-theme lg:flex lg:min-h-dvh">
        {/* ── Left half — animated pets hero (desktop only) ────────────── */}
        <section
          className="hidden lg:flex lg:flex-col lg:w-1/2 lg:min-h-dvh relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green) 0%, var(--vet-green-dim) 60%, oklch(38% 0.12 38) 100%)",
          }}
        >
          {/* Subtle dot pattern overlay */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          {/* Animation area — generous 60% of the column */}
          <div className="basis-[60%] grow-0 shrink-0 relative">
            <AnimatedPetsHero />
          </div>

          {/* Welcome copy — centered in its 40%, breathing room */}
          <div className="basis-[40%] grow-0 shrink-0 flex flex-col justify-center px-12 xl:px-16 relative z-10">
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
            <h1 className="text-white text-[40px] xl:text-[44px] font-black tracking-tight leading-[1.1] flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <span>Bienvenido a</span>
              <Image
                src="/vetsfriend-wordmark-white.png"
                alt="Vetsfriend"
                width={800}
                height={124}
                priority
                className="inline-block h-[44px] xl:h-[48px] w-auto"
                style={{ transform: "translateY(6px)" }}
              />
              <span>.</span>
            </h1>
            <p className="text-white/85 text-[16px] xl:text-[17px] font-semibold mt-5 max-w-md leading-relaxed">
              La clínica veterinaria al alcance de tu mano. Agenda citas,
              consulta el historial de tu mascota y mantente conectado con
              quienes los cuidan mejor.
            </p>
          </div>
        </section>

        {/* ── Right half / mobile — login form ─────────────────────────── */}
        <section className="min-h-dvh lg:w-1/2 flex flex-col items-center justify-center px-5 py-8 lg:py-12 lg:px-14 relative">
          <div className="w-full max-w-sm lg:max-w-md flex flex-col gap-5 lg:gap-6 relative z-10">
            <Image
              src="/vetsfriend-banner.png"
              alt="Vetsfriend — Clínica & Grooming"
              width={1200}
              height={400}
              priority
              className="w-full h-auto rounded-[22px]"
              style={{
                border: "1px solid var(--vet-border)",
                boxShadow: "0 10px 28px rgba(206, 90, 45, 0.14)",
              }}
            />

            <div
              className="border p-6 lg:p-8 rounded-[24px]"
              style={{
                background:
                  "color-mix(in oklab, var(--vet-bg-card) 92%, transparent)",
                borderColor: "var(--vet-border)",
                boxShadow: "0 14px 44px oklch(50% 0.04 40 / 0.10)",
              }}
            >
              <h2
                className="text-[24px] lg:text-[28px] font-black tracking-tight"
                style={{ color: "var(--vet-text-1)" }}
              >
                Iniciar sesión
              </h2>
              <p
                className="text-[13px] lg:text-[14px] font-semibold mb-5 lg:mb-6"
                style={{ color: "var(--vet-text-3)" }}
              >
                Ingresa tus credenciales para continuar.
              </p>
              <LoginForm />
            </div>

            <p
              className="text-center text-[13px] lg:text-[14px] font-semibold"
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
