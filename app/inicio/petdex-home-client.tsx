"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { PetHero, type PetHeroData } from "@/components/client/PetHero";
import { PetSwitcher } from "@/components/client/PetSwitcher";
import type { PetPalette } from "@/lib/pet-flavor";

export type PetdexPet = PetHeroData & {
  breed: string | null;
  funFact: string;
  age: string;
  weight: string;
  vaccinesAllOk: boolean;
  milestones: { icon: string; label: string; value: string }[];
  lastVisitLabel: string | null;
  nextAppt: {
    id: string;
    reason: string;
    dateLabel: string;
    timeLabel: string;
    vetName: string;
  } | null;
};

type Props = {
  pets: PetdexPet[];
  initialActiveId: string;
};

export function PetdexHomeClient({ pets, initialActiveId }: Props) {
  const [activeId, setActiveId] = useState(initialActiveId);
  const [, startTransition] = useTransition();

  const active = pets.find((p) => p.id === activeId) ?? pets[0];

  // Persist active pet id in a cookie so other client routes can pick it up.
  useEffect(() => {
    document.cookie = `activePetId=${activeId}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
  }, [activeId]);

  function pickPet(id: string) {
    startTransition(() => setActiveId(id));
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* Hero + switcher in a single visual block */}
      <PetHero pet={active} />

      <PetSwitcher
        pets={pets.map((p) => ({
          id: p.id,
          name: p.name,
          species: p.species,
          photoUrl: p.photoUrl,
          palette: p.palette,
        }))}
        activeId={active.id}
        onSelect={pickPet}
      />

      {/* On desktop, surface 2-col grid for next + health + fun + milestones */}
      <div className="grid lg:grid-cols-2 lg:gap-5 gap-3">
        {/* Próxima visita */}
        {active.nextAppt && (
          <NextAppointmentCard pet={active} />
        )}

        {/* Health stats */}
        <HealthSummaryCard pet={active} />

        {/* Fun fact */}
        <FunFactCard pet={active} />

        {/* Milestones */}
        <MilestonesCard pet={active} />
      </div>
    </div>
  );
}

function NextAppointmentCard({ pet }: { pet: PetdexPet }) {
  const next = pet.nextAppt!;
  const p = pet.palette;
  return (
    <Link
      href={`/cita/${next.id}`}
      className="block rounded-[20px] p-4 lg:p-5 hover:brightness-[1.02] transition"
      style={{
        background: "var(--color-surface)",
        boxShadow: "0 4px 18px rgba(206, 90, 45, 0.08)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="rounded-[14px] flex items-center justify-center text-[22px] shrink-0"
          style={{
            width: 48,
            height: 48,
            background: `${p.accent}1a`,
          }}
        >
          📅
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-extrabold uppercase tracking-wider"
            style={{ color: "var(--color-muted)" }}
          >
            Próxima visita al vet
          </p>
          <p
            className="text-[15px] font-black truncate"
            style={{ color: "var(--color-foreground)" }}
          >
            {next.reason}
          </p>
          <p
            className="text-[12px] font-bold truncate"
            style={{ color: p.accent }}
          >
            {next.dateLabel} · {next.timeLabel}
          </p>
        </div>
        <span
          className="px-3 py-1.5 rounded-[10px] text-white text-[12px] font-extrabold shrink-0"
          style={{ background: p.accent }}
        >
          Ver
        </span>
      </div>
    </Link>
  );
}

function HealthSummaryCard({ pet }: { pet: PetdexPet }) {
  const items = [
    {
      icon: "💉",
      label: "Vacunas",
      value: pet.vaccinesAllOk ? "¡Al día! 🎉" : "Revisar ⚠️",
      ok: pet.vaccinesAllOk,
    },
    {
      icon: "🩺",
      label: "Última visita",
      value: pet.lastVisitLabel ?? "—",
      ok: true,
    },
    {
      icon: "⚖️",
      label: "Peso",
      value: pet.weight,
      ok: true,
    },
  ];
  return (
    <div
      className="rounded-[20px] p-4 lg:p-5"
      style={{
        background: "var(--color-surface)",
        boxShadow: "0 4px 18px rgba(206, 90, 45, 0.06)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[14px] font-black"
          style={{ color: "var(--color-foreground)" }}
        >
          Cómo está {pet.name} hoy
        </p>
        <Link
          href="/mascotas"
          className="text-[12px] font-bold"
          style={{ color: pet.palette.accent }}
        >
          Ver salud →
        </Link>
      </div>
      <div className="flex gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex-1 px-2 py-2.5 rounded-[14px] text-center"
            style={{
              background: it.ok
                ? "color-mix(in oklab, var(--vet-green, #2f7d4f) 8%, var(--color-surface-2, var(--color-surface)))"
                : "color-mix(in oklab, var(--vet-amber, #d49247) 14%, var(--color-surface-2, var(--color-surface)))",
            }}
          >
            <div className="text-[18px] mb-1">{it.icon}</div>
            <p
              className="text-[10px] font-extrabold"
              style={{ color: "var(--color-muted)" }}
            >
              {it.label}
            </p>
            <p
              className="text-[10px] font-extrabold leading-tight mt-0.5"
              style={{
                color: it.ok
                  ? "var(--vet-green, #2f7d4f)"
                  : "var(--vet-amber, #b46e3e)",
              }}
            >
              {it.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunFactCard({ pet }: { pet: PetdexPet }) {
  const p = pet.palette;
  return (
    <div
      className="rounded-[20px] p-4 lg:p-5"
      style={{
        background: `linear-gradient(135deg, ${p.soft}, var(--color-surface))`,
        border: `1px solid ${p.accent}20`,
      }}
    >
      <p
        className="text-[13px] font-black mb-1.5"
        style={{ color: "var(--color-foreground)" }}
      >
        ✨ Algo especial de {pet.name}
      </p>
      <p
        className="text-[13px] font-semibold leading-relaxed italic"
        style={{ color: "var(--color-muted)" }}
      >
        “{pet.funFact}”
      </p>
    </div>
  );
}

function MilestonesCard({ pet }: { pet: PetdexPet }) {
  const p = pet.palette;
  return (
    <div
      className="rounded-[20px] p-4 lg:p-5"
      style={{
        background: "var(--color-surface)",
        boxShadow: "0 4px 18px rgba(206, 90, 45, 0.06)",
        border: "1px solid var(--color-border)",
      }}
    >
      <p
        className="text-[13px] font-black mb-3"
        style={{ color: "var(--color-foreground)" }}
      >
        🗓 La historia de {pet.name}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {pet.milestones.map((m) => (
          <div
            key={m.label}
            className="flex-shrink-0 px-3 py-2.5 rounded-[14px] text-center"
            style={{
              minWidth: 92,
              background: p.soft,
              border: `1px solid ${p.accent}20`,
            }}
          >
            <div className="text-[20px] mb-1">{m.icon}</div>
            <p
              className="text-[10px] font-extrabold"
              style={{ color: "var(--color-muted)" }}
            >
              {m.label}
            </p>
            <p
              className="text-[11px] font-extrabold mt-0.5"
              style={{ color: p.accent }}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
