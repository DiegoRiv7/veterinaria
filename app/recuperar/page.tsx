import Image from "next/image";
import Link from "next/link";
import { Nunito } from "next/font/google";
import { RecoverForm } from "./recover-form";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export const dynamic = "force-dynamic";

export default function RecoverPage() {
  return (
    <div className={nunito.variable}>
      <main className="vet-theme min-h-dvh flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm flex flex-col gap-5">
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
            className="border p-6 rounded-[22px]"
            style={{
              background:
                "color-mix(in oklab, var(--vet-bg-card) 92%, transparent)",
              borderColor: "var(--vet-border)",
              boxShadow: "0 12px 40px oklch(50% 0.04 40 / 0.08)",
            }}
          >
            <h1
              className="text-[22px] font-black tracking-tight"
              style={{ color: "var(--vet-text-1)" }}
            >
              Recuperar contraseña
            </h1>
            <p
              className="text-[13px] font-semibold mb-5"
              style={{ color: "var(--vet-text-3)" }}
            >
              Ingresa el correo de tu cuenta y la clínica se pondrá en contacto contigo.
            </p>
            <RecoverForm />
          </div>

          <p
            className="text-center text-[13px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            ¿Te acordaste?{" "}
            <Link
              href="/login"
              className="font-extrabold no-underline"
              style={{ color: "var(--vet-green)" }}
            >
              Volver a entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
