"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/utils";

const BRAND_COLORS = ["#38bdf8", "#6366f1", "#ec4899", "#10b981", "#fbbf24"];

export function SuccessCelebration({
  scheduledAt,
  appointmentId,
  onClose,
}: {
  scheduledAt: string;
  appointmentId: string;
  onClose?: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: BRAND_COLORS,
    });
    const t1 = setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: BRAND_COLORS,
      });
    }, 250);
    const t2 = setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: BRAND_COLORS,
      });
    }, 400);

    const redirect = setTimeout(() => {
      router.push(`/cita/${appointmentId}`);
    }, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(redirect);
    };
  }, [appointmentId, router]);

  const prettyDate = `${formatDate(scheduledAt)} a las ${formatTime(scheduledAt)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gradient-to-br from-[#38bdf8]/30 via-[#6366f1]/30 to-[#ec4899]/30 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Cita confirmada"
    >
      <div className="relative w-full max-w-sm rounded-[24px] bg-white shadow-[var(--shadow-soft-md)] p-7 flex flex-col items-center text-center">
        <div
          className="h-24 w-24 rounded-[28px] bg-gradient-to-br from-[#38bdf8] via-[#6366f1] to-[#ec4899] flex items-center justify-center shadow-[var(--shadow-glow)] ring-4 ring-white animate-bounce-in"
          style={{
            animation: "vetSuccessPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
        >
          <CircleCheck className="h-14 w-14 text-white" strokeWidth={2.5} />
        </div>

        <h2 className="mt-5 text-[28px] font-bold text-[var(--color-foreground)] tracking-tight">
          ¡Listo!
        </h2>
        <p className="mt-2 text-[15px] text-[var(--color-muted)] leading-relaxed">
          Te esperamos el{" "}
          <span className="text-[var(--color-foreground)] font-medium">
            {prettyDate}
          </span>
        </p>

        <div className="mt-6 w-full flex flex-col gap-2.5">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              onClose?.();
              router.push(`/cita/${appointmentId}`);
            }}
          >
            Ver mi cita
          </Button>
          <Link
            href="/inicio"
            className="text-[14px] text-[var(--color-muted)] hover:text-[var(--color-brand)] py-2 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes vetSuccessPop {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-10deg);
          }
          60% {
            opacity: 1;
            transform: scale(1.1) rotate(3deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }
      `}</style>
    </div>
  );
}
