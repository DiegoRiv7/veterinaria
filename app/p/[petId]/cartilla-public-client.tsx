"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const CHIPS = [
  { id: "datos", label: "Datos" },
  { id: "contacto", label: "Contacto" },
  { id: "vacunas", label: "Vacunas" },
  { id: "desparas", label: "Desparas." },
  { id: "cirugias", label: "Procedimientos" },
  { id: "visitas", label: "Visitas" },
];

export function NavChips({ accent }: { accent: string }) {
  const [active, setActive] = useState<string>("datos");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    CHIPS.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  function onClick(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
    setActive(id);
  }

  return (
    <div
      className="sticky z-30 -mx-4 px-4 py-3 overflow-x-auto scrollbar-none"
      style={{
        top: 0,
        background:
          "color-mix(in oklab, oklch(18% 0.04 35) 88%, transparent)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        borderBottom: "1px solid oklch(28% 0.04 35)",
      }}
    >
      <div className="flex items-center gap-2">
        {CHIPS.map((c) => {
          const isActive = active === c.id;
          return (
            <a
              key={c.id}
              href={`#${c.id}`}
              onClick={(e) => onClick(e, c.id)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] transition-colors whitespace-nowrap"
              style={{
                background: isActive ? accent : "oklch(24% 0.05 35)",
                color: isActive ? "white" : "oklch(78% 0.04 60)",
                fontWeight: isActive ? 800 : 600,
                border: `1px solid ${isActive ? accent : "oklch(34% 0.05 35)"}`,
              }}
            >
              {c.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

type VisitDetail = {
  id: string;
  serviceName: string;
  date: string;
  vetName: string;
  vetNotes: string | null;
  instructions: string | null;
  medications: string | null;
};

export function VisitsList({
  items,
  accent,
}: {
  items: VisitDetail[];
  accent: string;
}) {
  if (items.length === 0) {
    return (
      <p
        className="text-[12px] font-semibold text-center py-4 px-4"
        style={{ color: "oklch(58% 0.04 60)" }}
      >
        Sin visitas registradas.
      </p>
    );
  }
  return (
    <>
      {items.map((v) => (
        <ExpandableVisit key={v.id} visit={v} accent={accent} />
      ))}
    </>
  );
}

function ExpandableVisit({
  visit,
  accent,
}: {
  visit: VisitDetail;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails =
    !!visit.vetNotes || !!visit.instructions || !!visit.medications;
  return (
    <div
      className="border-t"
      style={{ borderTopColor: "oklch(34% 0.05 35)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left transition-colors"
        style={{
          background: open ? "oklch(28% 0.05 35)" : "transparent",
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p
              className="text-[13px] font-extrabold"
              style={{ color: "oklch(96% 0.02 60)" }}
            >
              {visit.serviceName}
            </p>
            <span
              className="text-[11px] font-semibold whitespace-nowrap"
              style={{ color: "oklch(78% 0.04 60)" }}
            >
              {visit.date}
            </span>
          </div>
          <p
            className="text-[11px] font-bold"
            style={{ color: accent }}
          >
            {visit.vetName}
          </p>
        </div>
        <ChevronDown
          className="h-4 w-4 mt-1 transition-transform"
          style={{
            color: "oklch(72% 0.04 60)",
            transform: open ? "rotate(180deg)" : "rotate(0)",
          }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          {!hasDetails ? (
            <p
              className="text-[12px] font-semibold italic"
              style={{ color: "oklch(72% 0.04 60)" }}
            >
              Sin notas registradas para esta visita.
            </p>
          ) : (
            <>
              {visit.vetNotes && (
                <DetailBlock label="DIAGNÓSTICO" value={visit.vetNotes} />
              )}
              {visit.instructions && (
                <DetailBlock
                  label="INDICACIONES"
                  value={visit.instructions}
                />
              )}
              {visit.medications && (
                <DetailBlock
                  label="MEDICAMENTOS"
                  value={visit.medications}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-[10px] px-3 py-2.5"
      style={{ background: "oklch(20% 0.04 35)" }}
    >
      <p
        className="text-[9px] font-extrabold tracking-[0.5px] mb-1"
        style={{ color: "oklch(58% 0.04 60)" }}
      >
        {label}
      </p>
      <p
        className="text-[12px] font-semibold leading-snug whitespace-pre-line"
        style={{ color: "oklch(78% 0.04 60)" }}
      >
        {value}
      </p>
    </div>
  );
}
