"use client";

import { useEffect, useState } from "react";

const PETS = [
  { emoji: "🐶", label: "Perros" },
  { emoji: "🐱", label: "Gatos" },
  { emoji: "🐰", label: "Conejos" },
  { emoji: "🦜", label: "Aves" },
  { emoji: "🦎", label: "Reptiles" },
  { emoji: "🐹", label: "Hámsters" },
];

const FLOATERS: { emoji: string; top?: string; bottom?: string; left?: string; right?: string; delay: number; size: number }[] = [
  { emoji: "🐾", top: "8%",  left: "10%",  delay: 0,    size: 42 },
  { emoji: "🐾", top: "22%", right: "14%", delay: 2.2,  size: 36 },
  { emoji: "🐾", bottom: "28%", left: "18%", delay: 1.4, size: 50 },
  { emoji: "🐾", bottom: "10%", right: "20%", delay: 3.0, size: 38 },
  { emoji: "💛", top: "44%",  left: "8%",   delay: 4.2, size: 26 },
  { emoji: "💛", top: "60%",  right: "8%",  delay: 0.6, size: 24 },
  { emoji: "🦴", top: "12%",  right: "32%", delay: 1.8, size: 30 },
  { emoji: "🦴", bottom: "20%", left: "42%", delay: 3.6, size: 28 },
];

export function AnimatedPetsHero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % PETS.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Decorative floaters drifting in the background */}
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute select-none animate-[floaty_9s_ease-in-out_infinite]"
          style={{
            top: f.top,
            bottom: f.bottom,
            left: f.left,
            right: f.right,
            fontSize: f.size,
            opacity: 0.22,
            animationDelay: `${f.delay}s`,
            filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.18))",
          }}
        >
          {f.emoji}
        </span>
      ))}

      {/* Soft glow behind the featured pet */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: 380,
          height: 380,
          background:
            "radial-gradient(circle, rgba(255,237,212,0.28) 0%, transparent 70%)",
        }}
      />

      {/* Featured pet — crossfade carousel. Reserve bottom space for dots. */}
      <div className="absolute inset-0 pb-20 flex items-center justify-center">
        {PETS.map((p, i) => (
          <div
            key={p.label}
            className="absolute flex flex-col items-center"
            style={{
              opacity: i === active ? 1 : 0,
              transform:
                i === active ? "scale(1) translateY(0)" : "scale(0.78) translateY(8px)",
              transition: "opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <div
              className="select-none"
              style={{
                fontSize: 200,
                filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.25))",
                animation: "petBob 3.2s ease-in-out infinite",
              }}
            >
              {p.emoji}
            </div>
            <div
              className="mt-3 px-5 py-1.5 rounded-full text-[14px] font-extrabold uppercase tracking-[0.18em]"
              style={{
                background: "rgba(255,255,255,0.18)",
                color: "white",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.28)",
              }}
            >
              {p.label}
            </div>
          </div>
        ))}
      </div>

      {/* Progress dots — pinned to bottom with safe gap from the pill above */}
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
                  : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes floaty {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(14px, -22px); }
        }
        @keyframes petBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="animate-[floaty"], [style*="petBob"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
