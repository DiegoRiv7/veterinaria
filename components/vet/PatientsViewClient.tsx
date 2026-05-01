"use client";

import { useState } from "react";
import Link from "next/link";
import { SPECIES_EMOJI } from "@/lib/utils";
import { VetIcon } from "./VetIcon";

type PetRow = {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  weight: string;
  owner: string;
  lastVisit: string;
};

const SPECIES_TINT: Record<string, string> = {
  DOG: "#f4a460",
  CAT: "#b19cd9",
  BIRD: "#90ee90",
  RABBIT: "#d3d3d3",
  HAMSTER: "#ffd180",
  REPTILE: "#ffd700",
  OTHER: "#a0c4ff",
};

export function PatientsViewClient({ pets }: { pets: PetRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = pets.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.owner.toLowerCase().includes(q) ||
      p.breed.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-black tracking-tight" style={{ color: "var(--vet-text-1)" }}>
          Pacientes
        </h2>
        <div className="text-[13px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
          {pets.length} {pets.length === 1 ? "paciente registrado" : "pacientes registrados"}
        </div>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 border"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 12,
        }}
      >
        <VetIcon name="search" size={16} color="var(--vet-text-3)" />
        <input
          type="text"
          placeholder="Buscar por nombre, dueño o raza..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[14px] font-semibold"
          style={{ color: "var(--vet-text-1)" }}
        />
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div
          className="py-14 text-center border"
          style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)", borderRadius: 22, color: "var(--vet-text-3)" }}
        >
          <div className="text-[40px] mb-2">🐾</div>
          <div className="text-[14px] font-bold" style={{ color: "var(--vet-text-2)" }}>
            {search ? "Ningún paciente coincide" : "Sin pacientes registrados"}
          </div>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        >
          {filtered.map((p) => {
            const tint = SPECIES_TINT[p.species] ?? "#a0c4ff";
            return (
              <Link
                key={p.id}
                href={`/vet/pacientes/${p.id}`}
                className="border p-4 transition-transform no-underline hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  borderRadius: 22,
                  color: "var(--vet-text-1)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2"
                    style={{ background: `${tint}33`, borderColor: `${tint}77` }}
                  >
                    {SPECIES_EMOJI[p.species] ?? "🐾"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-[16px] truncate" style={{ color: "var(--vet-text-1)" }}>
                      {p.name}
                    </div>
                    <div className="text-[12px] font-semibold truncate" style={{ color: "var(--vet-text-3)" }}>
                      {p.breed}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 mb-2.5">
                  {[
                    { l: "Edad", v: p.age },
                    { l: "Peso", v: p.weight },
                  ].map((it) => (
                    <div
                      key={it.l}
                      className="flex-1 rounded-lg py-1.5 text-center"
                      style={{ background: "var(--vet-bg-mid)" }}
                    >
                      <div className="text-[11px] font-bold" style={{ color: "var(--vet-text-3)" }}>
                        {it.l}
                      </div>
                      <div className="vet-mono text-[13px] font-extrabold" style={{ color: "var(--vet-text-1)" }}>
                        {it.v}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                  👤 {p.owner}
                </div>
                <div className="text-[11px] font-semibold mt-1" style={{ color: "var(--vet-text-3)" }}>
                  Última visita: <span style={{ color: "var(--vet-green)" }}>{p.lastVisit}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
