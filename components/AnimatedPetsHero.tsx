"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Carrusel de mascotas del panel de bienvenida (login, desktop).
 *
 * Minimalista a propósito: una mascota 3D (emojis Fluent de Microsoft,
 * MIT, servidos desde /public/pets) sobre el panel de marca, con un
 * flotado casi imperceptible, sombra de piso que respira y un crossfade
 * con deriva sutil entre mascotas. Sin adornos.
 */

const PETS = [
  { src: "/pets/dog.png", label: "Perros" },
  { src: "/pets/cat.png", label: "Gatos" },
  { src: "/pets/rabbit.png", label: "Conejos" },
  { src: "/pets/parrot.png", label: "Aves" },
  { src: "/pets/lizard.png", label: "Reptiles" },
  { src: "/pets/hamster.png", label: "Hámsters" },
];

const HOLD_MS = 3600;

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
      {/* Resplandor cálido, apenas presente */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: 440,
          height: 440,
          background:
            "radial-gradient(circle, rgba(255,224,190,0.16) 0%, rgba(255,224,190,0.05) 50%, transparent 70%)",
        }}
      />

      {/* Crossfade con deriva sutil entre mascotas */}
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
                  ? "translateX(0) scale(1)"
                  : isLeaving
                    ? "translateX(-28px) scale(0.97)"
                    : "translateX(28px) scale(0.97)",
                transition:
                  "opacity 0.8s ease, transform 1s cubic-bezier(0.22, 1, 0.36, 1)",
                pointerEvents: "none",
              }}
            >
              {/* Flotado casi imperceptible, separado de la transición */}
              <div
                style={{
                  animation: isActive
                    ? "petBob 4.6s ease-in-out infinite"
                    : "none",
                }}
              >
                <Image
                  src={p.src}
                  alt={p.label}
                  width={256}
                  height={256}
                  priority={i === 0}
                  className="w-[200px] h-[200px] xl:w-[224px] xl:h-[224px] select-none"
                  style={{
                    filter: "drop-shadow(0 20px 30px rgba(50, 16, 4, 0.28))",
                  }}
                />
              </div>

              {/* Sombra de piso que respira con el flotado */}
              <div
                aria-hidden
                className="mt-2"
                style={{
                  width: 120,
                  height: 18,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse at center, rgba(50, 16, 4, 0.30) 0%, transparent 70%)",
                  animation: isActive
                    ? "petShadow 4.6s ease-in-out infinite"
                    : "none",
                }}
              />

              {/* Etiqueta tipográfica, sin adornos */}
              <p
                className="mt-7 text-[12px] font-bold uppercase select-none"
                style={{
                  color: "rgba(255,255,255,0.72)",
                  letterSpacing: "0.34em",
                  textIndent: "0.34em",
                }}
              >
                {p.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Progreso — líneas mínimas */}
      <div className="absolute bottom-7 left-0 right-0 flex justify-center gap-2">
        {PETS.map((_, i) => (
          <span
            key={i}
            className="h-[3px] rounded-full transition-all duration-500"
            style={{
              width: i === active ? 22 : 8,
              background:
                i === active
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.22)",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes petBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes petShadow {
          0%, 100% { transform: scaleX(1); opacity: 1; }
          50% { transform: scaleX(0.88); opacity: 0.75; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="petBob"], [style*="petShadow"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
