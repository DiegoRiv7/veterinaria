"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Carrusel de mascotas del panel de bienvenida (login, desktop).
 *
 * Usa los emojis 3D de Fluent (Microsoft, MIT) servidos desde
 * /public/pets para un look consistente en todos los navegadores.
 * Cada mascota entra desde la derecha, se asienta al centro con un
 * balanceo suave y sale hacia la izquierda — con una sombra de piso
 * que respira con el movimiento para que se sienta parada en la
 * escena y no pegada encima.
 */

const PETS = [
  { src: "/pets/dog.png", label: "Perros" },
  { src: "/pets/cat.png", label: "Gatos" },
  { src: "/pets/rabbit.png", label: "Conejos" },
  { src: "/pets/parrot.png", label: "Aves" },
  { src: "/pets/lizard.png", label: "Reptiles" },
  { src: "/pets/hamster.png", label: "Hámsters" },
];

const HOLD_MS = 3400;

const FLOATERS: {
  emoji: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  delay: number;
  size: number;
}[] = [
  { emoji: "🐾", top: "10%", left: "12%", delay: 0, size: 38 },
  { emoji: "🐾", top: "20%", right: "14%", delay: 2.6, size: 30 },
  { emoji: "🐾", bottom: "24%", left: "16%", delay: 1.2, size: 44 },
  { emoji: "🦴", top: "14%", right: "34%", delay: 3.8, size: 26 },
  { emoji: "💛", top: "52%", right: "9%", delay: 1.8, size: 22 },
  { emoji: "🦴", bottom: "16%", right: "24%", delay: 5.0, size: 24 },
];

export function AnimatedPetsHero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % PETS.length);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Decoración de fondo, muy sutil */}
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute select-none"
          style={{
            top: f.top,
            bottom: f.bottom,
            left: f.left,
            right: f.right,
            fontSize: f.size,
            opacity: 0.14,
            animation: "petFloaty 12s ease-in-out infinite",
            animationDelay: `${f.delay}s`,
            filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.18))",
          }}
        >
          {f.emoji}
        </span>
      ))}

      {/* Resplandor cálido detrás de la mascota */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: 460,
          height: 460,
          background:
            "radial-gradient(circle, rgba(255,224,190,0.30) 0%, rgba(255,224,190,0.10) 45%, transparent 70%)",
        }}
      />

      {/* Carrusel direccional: entra por la derecha, sale por la izquierda */}
      <div className="absolute inset-0 pb-16 flex items-center justify-center">
        {PETS.map((p, i) => {
          const n = PETS.length;
          const offset = (i - active + n) % n;
          const isActive = offset === 0;
          const isLeaving = offset === n - 1;
          return (
            <div
              key={p.label}
              className="absolute flex flex-col items-center will-change-transform"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive
                  ? "translateX(0) scale(1) rotate(0deg)"
                  : isLeaving
                    ? "translateX(-70%) scale(0.6) rotate(-10deg)"
                    : "translateX(70%) scale(0.6) rotate(10deg)",
                transition:
                  "opacity 0.7s ease, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
                pointerEvents: "none",
              }}
            >
              {/* El balanceo vive en un wrapper interno para no pelear
                  con la transición de entrada/salida del wrapper externo */}
              <div
                className="flex flex-col items-center"
                style={{
                  animation: isActive
                    ? "petBob 3.4s ease-in-out infinite"
                    : "none",
                }}
              >
                <Image
                  src={p.src}
                  alt={p.label}
                  width={256}
                  height={256}
                  priority={i === 0}
                  className="w-[230px] h-[230px] xl:w-[260px] xl:h-[260px] select-none"
                  style={{
                    filter: "drop-shadow(0 24px 36px rgba(60, 20, 5, 0.35))",
                  }}
                />
              </div>

              {/* Sombra de piso que respira con el balanceo */}
              <div
                aria-hidden
                className="mt-1"
                style={{
                  width: 150,
                  height: 26,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse at center, rgba(50, 16, 4, 0.38) 0%, transparent 70%)",
                  animation: isActive
                    ? "petShadow 3.4s ease-in-out infinite"
                    : "none",
                }}
              />

              <div
                className="mt-4 px-5 py-1.5 rounded-full text-[13px] font-extrabold uppercase tracking-[0.18em]"
                style={{
                  background: "rgba(255,255,255,0.16)",
                  color: "white",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.26)",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.14)",
                }}
              >
                {p.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Puntos de progreso */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5">
        {PETS.map((_, i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === active ? 24 : 6,
              background:
                i === active
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.32)",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes petFloaty {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(12px, -20px) rotate(6deg); }
        }
        @keyframes petBob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(-1.6deg); }
        }
        @keyframes petShadow {
          0%, 100% { transform: scaleX(1); opacity: 1; }
          50% { transform: scaleX(0.82); opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="petBob"], [style*="petFloaty"], [style*="petShadow"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
