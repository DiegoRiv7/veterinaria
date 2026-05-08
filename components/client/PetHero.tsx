"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PetPalette } from "@/lib/pet-flavor";

export type PetHeroData = {
  id: string;
  name: string;
  species: string;
  photoUrl: string | null;
  galleryUrls: string[];
  bgEmojis: string[];
  mood: string;
  personality: string[];
  status: string;
  statusOk: boolean;
  palette: PetPalette;
};

export function PetHero({
  pet,
  onAgendar,
}: {
  pet: PetHeroData;
  onAgendar?: () => void;
}) {
  const tiles: { kind: "photo"; url: string }[] | { kind: "emoji"; char: string }[] =
    pet.galleryUrls.length > 0
      ? pet.galleryUrls.map((u) => ({ kind: "photo" as const, url: u }))
      : pet.bgEmojis.map((c) => ({ kind: "emoji" as const, char: c }));
  const slides = tiles.length > 0 ? tiles : [{ kind: "emoji" as const, char: "🐾" }];

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [pet.id]);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 3200);
    return () => clearInterval(t);
  }, [slides.length, pet.id]);

  const current = slides[idx % slides.length];
  const p = pet.palette;

  return (
    <div
      className="relative overflow-hidden rounded-[28px] lg:rounded-[32px]"
      style={{
        height: 380,
        background: `linear-gradient(145deg, ${p.from}, ${p.to})`,
        boxShadow: `0 16px 52px ${p.accent}33`,
      }}
    >
      {/* Background photo / emoji */}
      <div className="absolute inset-0 transition-opacity duration-700">
        {current.kind === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt=""
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center select-none"
            style={{ fontSize: 220, opacity: 0.18, lineHeight: 1 }}
            aria-hidden
          >
            {current.char}
          </div>
        )}
      </div>

      {/* Bottom darkening for legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Glow */}
      <div
        aria-hidden
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
        style={{
          background: "rgba(255,255,255,0.16)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 h-full px-5 lg:px-7 pt-5 lg:pt-6 flex flex-col">
        {/* Status chip */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full self-start mb-2"
          style={{
            background: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(10px)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: pet.statusOk ? "#7df291" : "#ffe566",
              boxShadow: pet.statusOk
                ? "0 0 8px #7df291"
                : "0 0 8px #ffe566",
            }}
          />
          <span className="text-white text-[11px] font-extrabold uppercase tracking-wide">
            {pet.status}
          </span>
        </div>

        {/* Name */}
        <h1
          className="text-white text-[58px] lg:text-[68px] font-black leading-none tracking-tight"
          style={{ textShadow: "0 2px 20px rgba(0,0,0,0.25)" }}
        >
          {pet.name}
        </h1>

        {/* Mood */}
        <p
          className="text-white/85 text-[14px] lg:text-[15px] font-bold italic mt-2"
        >
          {pet.mood}
        </p>

        {/* Personality tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {pet.personality.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full text-white text-[11px] font-extrabold"
              style={{
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(6px)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex-1" />

        {/* Bottom: agendar + dots */}
        <div className="flex items-center justify-between pb-5 lg:pb-6">
          {onAgendar ? (
            <button
              type="button"
              onClick={onAgendar}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-[13px] font-extrabold transition hover:brightness-110 active:scale-[.99]"
              style={{
                background: "rgba(255,255,255,0.20)",
                backdropFilter: "blur(10px)",
                border: "1.5px solid rgba(255,255,255,0.38)",
              }}
            >
              📅 Agendar cita
            </button>
          ) : (
            <Link
              href="/agendar"
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-[13px] font-extrabold transition hover:brightness-110 active:scale-[.99]"
              style={{
                background: "rgba(255,255,255,0.20)",
                backdropFilter: "blur(10px)",
                border: "1.5px solid rgba(255,255,255,0.38)",
              }}
            >
              📅 Agendar cita
            </Link>
          )}

          {slides.length > 1 && (
            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Foto ${i + 1}`}
                  className="rounded-full transition-all"
                  style={{
                    width: i === idx ? 22 : 6,
                    height: 6,
                    background:
                      i === idx ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
