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
    <div className={nunito.variable}>
      <main className="vet-theme lg:flex lg:min-h-dvh">
        {/* ── Left half — looping hero video (desktop only) ────────────── */}
        <section
          className="hidden lg:flex lg:flex-col lg:w-1/2 lg:min-h-dvh relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green) 0%, var(--vet-green-dim) 60%, oklch(38% 0.12 38) 100%)",
          }}
        >
          {/* Subtle dot pattern across the whole panel */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.07] z-[1]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          {/* Top frame — video lives only in the upper 55% of the panel */}
          <div className="basis-[55%] grow-0 shrink-0 relative overflow-hidden">
            <video
              src="/login-hero.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                mixBlendMode: "multiply",
                filter: "saturate(1.1) contrast(1.05)",
              }}
            />
            {/* Warm screen overlay to push the remaining cool tones toward
                the brand palette without losing the silhouette movement. */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, oklch(58% 0.16 40 / 0.20) 0%, oklch(48% 0.14 38 / 0.10) 100%)",
                mixBlendMode: "screen",
              }}
            />
            {/* Soft fade at the bottom of the video so it transitions into
                the welcome panel below instead of cutting hard. */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, transparent, color-mix(in oklab, var(--vet-green-dim) 70%, transparent))",
              }}
            />
          </div>

          {/* Bottom panel — welcome copy on clean brand gradient */}
          <div className="basis-[45%] grow-0 shrink-0 flex flex-col justify-center px-12 xl:px-16 relative z-10">
            <Image
              src="/vetsfriend-icon.png"
              alt="Vetsfriend"
              width={64}
              height={64}
              priority
              className="w-12 h-12 rounded-[14px] mb-5"
              style={{
                boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            />
            <h1
              className="text-white text-[40px] xl:text-[44px] font-black tracking-tight"
              style={{
                lineHeight: 1.15,
                textShadow: "0 2px 14px rgba(0,0,0,0.4)",
              }}
            >
              Bienvenido a{" "}
              <Image
                src="/vetsfriend-wordmark-white.png"
                alt="Vetsfriend"
                width={627}
                height={108}
                priority
                className="inline-block w-auto"
                style={{
                  height: "0.95em",
                  verticalAlign: "-0.18em",
                  marginLeft: "-0.18em",
                  marginRight: "-0.18em",
                }}
              />
              .
            </h1>
            <p
              className="text-white/95 text-[16px] xl:text-[17px] font-semibold mt-5 max-w-md leading-relaxed text-justify"
              style={{
                hyphens: "auto",
                textShadow: "0 1px 8px rgba(0,0,0,0.45)",
              }}
            >
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
              className="border p-7 lg:p-8 rounded-[24px]"
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
                className="text-[13px] lg:text-[14px] font-semibold mb-6 lg:mb-7"
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
