"use client";

import { useState } from "react";
import { Pill, Syringe, X } from "lucide-react";

/* Paleta muestreada del pasaporte impreso de Vetsfriend */
const BRAND = {
  orange: "#BC4E20",
  gold: "#EBB747",
  goldText: "#E9A83A",
  cream: "#FCECE3",
  creamRow: "#FBEDE2",
  ink: "#4A4A4A",
  inkSoft: "#A5A5A5",
};

export type CarnetPet = {
  id: string;
  name: string;
  speciesLabel: string;
  emoji: string;
  photoUrl: string | null;
  breed: string | null;
  sexLabel: string;
  birth: string | null; // ISO
  age: string;
  weightKg: number | null;
  microchipId: string | null;
  ownerName: string | null;
};

export type CarnetVaccine = {
  id: string;
  name: string;
  appliedAt: string;
  nextAt: string | null;
  weightKg: number | null;
  notes: string | null;
  vetName: string;
};

export type CarnetDeworming = {
  id: string;
  product: string;
  kind: string | null;
  appliedAt: string;
  nextAt: string | null;
  notes: string | null;
  vetName: string;
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(".", "");
}

/** Línea tipo MRZ (la zona de lectura mecánica de un pasaporte real). */
function mrz(raw: string, len = 34): string {
  const clean = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "<");
  return (clean + "<".repeat(len)).slice(0, len);
}

export function PassportCarnet({
  pet,
  vaccines,
  dewormings,
  initialOpen = false,
}: {
  pet: CarnetPet;
  vaccines: CarnetVaccine[];
  dewormings: CarnetDeworming[];
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [opening, setOpening] = useState(false);
  const [tab, setTab] = useState<"vac" | "dew">("vac");

  function openPassport() {
    if (open || opening) return;
    setOpening(true);
    window.setTimeout(() => {
      setOpening(false);
      setOpen(true);
    }, 320);
  }

  /* ─── Cerrado: la portada ───────────────────────────────────── */
  if (!open) {
    return (
      <div className="flex flex-col items-center py-4">
        <button
          type="button"
          onClick={openPassport}
          aria-label="Abrir carnet de vacunación"
          className="group relative w-[320px] max-w-full text-left cursor-pointer transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[0.6deg]"
          style={{
            transformOrigin: "left center",
            animation: "passportCoverIn 0.5s ease-out both",
            ...(opening
              ? {
                  transition: "transform 0.32s ease-in, opacity 0.32s ease-in",
                  transform: "perspective(1200px) rotateY(-70deg)",
                  opacity: 0.25,
                }
              : {}),
          }}
        >
          {/* hojas asomando por el canto derecho */}
          <div
            aria-hidden
            className="absolute top-[6px] bottom-[6px] -right-[5px] w-[10px] rounded-r-[6px]"
            style={{
              background:
                "repeating-linear-gradient(to bottom, #fffdf9 0 3px, #efdccb 3px 4px)",
              boxShadow: "2px 2px 8px rgba(0,0,0,0.12)",
            }}
          />
          <div
            className="relative rounded-r-[14px] rounded-l-[8px] px-6 pt-10 pb-8 flex flex-col items-center overflow-hidden"
            style={{
              background: BRAND.cream,
              boxShadow:
                "0 18px 40px -18px rgba(122, 51, 16, 0.45), inset -14px 0 24px -20px rgba(122,51,16,0.5), inset 3px 0 0 rgba(122,51,16,0.18)",
            }}
          >
            <p
              className="text-[30px] font-black leading-none"
              style={{ color: BRAND.orange, letterSpacing: "0.05em" }}
            >
              PASAPORTE
            </p>
            <p
              className="text-[11px] font-extrabold mt-1.5"
              style={{
                color: BRAND.goldText,
                letterSpacing: "0.5em",
                textIndent: "0.5em",
              }}
            >
              PASSPORT
            </p>

            <PassportSeal className="w-[196px] my-8" />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vetsfriend-wordmark.png"
              alt="Vetsfriend"
              className="h-8 w-auto"
            />
            <p
              className="text-[9px] font-extrabold mt-0.5"
              style={{ color: BRAND.goldText, letterSpacing: "0.14em" }}
            >
              Clínica &amp; Grooming
            </p>

            <span
              className="mt-6 inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-[11px] font-extrabold uppercase tracking-[0.08em] transition group-hover:brightness-105"
              style={{
                background: BRAND.orange,
                color: "#fff",
                boxShadow: "0 6px 14px -6px rgba(122,51,16,0.5)",
              }}
            >
              Abrir carnet <span aria-hidden>→</span>
            </span>
          </div>
        </button>
        <p
          className="mt-3 text-[12px] font-semibold"
          style={{ color: "var(--vet-text-3)" }}
        >
          Carnet de {pet.name} · toca la portada para abrirlo
        </p>
      </div>
    );
  }

  /* ─── Abierto: spread de dos páginas ────────────────────────── */
  return (
    <div
      className="relative rounded-[20px] overflow-hidden"
      style={{
        background: BRAND.cream,
        boxShadow: "0 22px 48px -20px rgba(122, 51, 16, 0.4)",
        animation: "passportSpreadIn 0.45s ease-out both",
      }}
    >
      {/* Cerrar */}
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Cerrar carnet"
        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full inline-flex items-center justify-center transition hover:brightness-110"
        style={{ background: "rgba(188,78,32,0.12)", color: BRAND.orange }}
      >
        <X size={15} strokeWidth={3} />
      </button>

      <div className="grid md:grid-cols-2 relative">
        {/* Lomo central (solo desktop) */}
        <div
          aria-hidden
          className="hidden md:block absolute inset-y-0 left-1/2 w-[46px] -translate-x-1/2 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(122,51,16,0.16) 46%, rgba(122,51,16,0.22) 50%, rgba(122,51,16,0.16) 54%, transparent)",
          }}
        />

        {/* ── Página izquierda: identidad ── */}
        <div
          className="relative px-6 sm:px-8 py-7 flex flex-col"
          style={{
            transformOrigin: "right center",
            animation: "passportPageSettle 0.55s ease-out both",
          }}
        >
          {/* sello de agua */}
          <PassportSeal
            aria-hidden
            className="absolute w-[340px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none"
          />

          <p
            className="text-[11px] font-extrabold uppercase"
            style={{ color: BRAND.orange, letterSpacing: "0.18em" }}
          >
            Datos de la mascota
          </p>
          <p
            className="text-[9px] font-bold uppercase mb-5"
            style={{ color: BRAND.goldText, letterSpacing: "0.22em" }}
          >
            Pet data
          </p>

          <div className="flex gap-5 items-start">
            {/* Foto tipo pasaporte */}
            <div
              className="w-[96px] h-[118px] rounded-[8px] overflow-hidden shrink-0 flex items-center justify-center text-[44px]"
              style={{
                border: `2px solid ${BRAND.gold}`,
                background: "#fff",
                boxShadow: "0 4px 10px -6px rgba(122,51,16,0.35)",
              }}
            >
              {pet.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pet.photoUrl}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{pet.emoji}</span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 flex-1 min-w-0">
              <IdField es="Nombre" en="Name" value={pet.name} big />
              <div className="grid grid-cols-2 gap-2.5">
                <IdField es="Especie" en="Species" value={pet.speciesLabel} />
                <IdField es="Raza" en="Breed" value={pet.breed ?? "—"} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
            <IdField es="Sexo" en="Sex" value={pet.sexLabel} />
            <IdField es="Nacimiento" en="Date of birth" value={fmt(pet.birth)} />
            <IdField es="Edad" en="Age" value={pet.age} />
            <IdField
              es="Peso"
              en="Weight"
              value={pet.weightKg != null ? `${pet.weightKg} kg` : "—"}
            />
            <IdField
              es="Microchip"
              en="Microchip"
              value={pet.microchipId ?? "—"}
            />
            <IdField es="Tutor" en="Owner" value={pet.ownerName ?? "—"} />
          </div>

          {/* Zona MRZ, como pasaporte real */}
          <div
            className="mt-auto pt-6 select-none"
            aria-hidden
            style={{ color: "rgba(188,78,32,0.5)" }}
          >
            <p className="font-mono text-[11px] leading-[1.5] tracking-[0.08em] whitespace-nowrap overflow-hidden">
              {mrz(`P<VETSFRIEND<${pet.name}<<${pet.breed ?? pet.speciesLabel}`)}
            </p>
            <p className="font-mono text-[11px] leading-[1.5] tracking-[0.08em] whitespace-nowrap overflow-hidden">
              {mrz(`${pet.id.slice(-10)}<${pet.speciesLabel}<<${pet.age}`)}
            </p>
          </div>
        </div>

        {/* ── Página derecha: registros ── */}
        <div className="px-6 sm:px-8 py-7 flex flex-col gap-4 min-w-0">
          {/* Tabs */}
          <div className="flex gap-2 pr-10">
            <TabPill
              active={tab === "vac"}
              onClick={() => setTab("vac")}
              icon={<Syringe size={14} strokeWidth={2.6} />}
              label="Vacunación"
              count={vaccines.length}
            />
            <TabPill
              active={tab === "dew"}
              onClick={() => setTab("dew")}
              icon={<Pill size={14} strokeWidth={2.6} />}
              label="Desparasitación"
              count={dewormings.length}
            />
          </div>

          {/* Encabezado bilingüe de la sección */}
          <div
            className="rounded-[8px] h-11 px-4 flex items-center justify-between text-white shrink-0"
            style={{ background: BRAND.orange }}
          >
            <p className="text-[15px] font-extrabold leading-none">
              {tab === "vac" ? "Vacunación" : "Desparasitación"}
              <span className="font-semibold opacity-80 text-[13px]">
                {" "}
                / {tab === "vac" ? "Vaccination" : "Deworming"}
              </span>
            </p>
            {tab === "vac" ? (
              <Syringe size={17} strokeWidth={2.6} />
            ) : (
              <Pill size={17} strokeWidth={2.6} />
            )}
          </div>

          {/* Registros */}
          <div className="flex flex-col gap-2">
            {tab === "vac" &&
              (vaccines.length === 0 ? (
                <EmptyState
                  emoji="💉"
                  title="Sin vacunas en el carnet"
                  hint="Se anexan al terminar una consulta de vacunación con la casilla “Agregar al carnet” marcada."
                />
              ) : (
                vaccines.map((v, i) => (
                  <RecordCard key={v.id} alt={i % 2 === 1}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p
                        className="text-[14px] font-extrabold leading-tight truncate"
                        style={{ color: BRAND.ink }}
                      >
                        {v.name}
                      </p>
                      <p
                        className="text-[12px] font-bold shrink-0"
                        style={{ color: BRAND.ink }}
                      >
                        {fmt(v.appliedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      <MiniStat es="Peso" value={v.weightKg != null ? `${v.weightKg} kg` : "—"} />
                      <MiniStat es="Próxima" value={fmt(v.nextAt)} />
                    </div>
                    {v.notes && (
                      <p
                        className="text-[11px] font-semibold mt-1.5 whitespace-pre-line"
                        style={{ color: BRAND.inkSoft }}
                      >
                        {v.notes}
                      </p>
                    )}
                    <Signature name={v.vetName} />
                  </RecordCard>
                ))
              ))}

            {tab === "dew" &&
              (dewormings.length === 0 ? (
                <EmptyState
                  emoji="💊"
                  title="Sin desparasitaciones en el carnet"
                  hint="Se anexan al terminar una consulta de desparasitación con la casilla “Anexar al carnet” marcada."
                />
              ) : (
                dewormings.map((d, i) => (
                  <RecordCard key={d.id} alt={i % 2 === 1}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p
                        className="text-[14px] font-extrabold leading-tight truncate"
                        style={{ color: BRAND.ink }}
                      >
                        {d.product}
                        {d.kind && (
                          <span
                            className="ml-2 align-middle inline-flex h-[18px] px-2 rounded-full text-[9px] font-extrabold uppercase tracking-[0.06em] items-center"
                            style={{
                              background: "rgba(188,78,32,0.10)",
                              color: BRAND.orange,
                            }}
                          >
                            {d.kind}
                          </span>
                        )}
                      </p>
                      <p
                        className="text-[12px] font-bold shrink-0"
                        style={{ color: BRAND.ink }}
                      >
                        {fmt(d.appliedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      <MiniStat es="Próxima" value={fmt(d.nextAt)} />
                    </div>
                    {d.notes && (
                      <p
                        className="text-[11px] font-semibold mt-1.5 whitespace-pre-line"
                        style={{ color: BRAND.inkSoft }}
                      >
                        {d.notes}
                      </p>
                    )}
                    <Signature name={d.vetName} />
                  </RecordCard>
                ))
              ))}
          </div>
        </div>
      </div>

      {/* Banda inferior de marca */}
      <div
        className="h-12 flex flex-col items-center justify-center gap-0"
        style={{ background: BRAND.orange }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vetsfriend-wordmark-white.png"
          alt="Vetsfriend"
          className="h-5 w-auto"
        />
        <p
          className="text-[7px] font-extrabold"
          style={{ color: BRAND.goldText, letterSpacing: "0.18em" }}
        >
          Clínica &amp; Grooming
        </p>
      </div>
    </div>
  );
}

/* ─── Piezas ────────────────────────────────────────────────────── */

function IdField({
  es,
  en,
  value,
  big = false,
}: {
  es: string;
  en: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className="text-[8.5px] font-extrabold uppercase leading-tight"
        style={{ color: BRAND.goldText, letterSpacing: "0.14em" }}
      >
        {es} <span style={{ opacity: 0.75 }}>/ {en}</span>
      </p>
      <p
        className={`${big ? "text-[19px]" : "text-[13px]"} font-black leading-tight truncate`}
        style={{ color: BRAND.ink }}
      >
        {value}
      </p>
    </div>
  );
}

function TabPill({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-extrabold transition"
      style={{
        background: active ? BRAND.orange : "rgba(188,78,32,0.08)",
        color: active ? "#fff" : BRAND.orange,
        boxShadow: active ? "0 6px 12px -6px rgba(122,51,16,0.5)" : "none",
      }}
    >
      {icon}
      {label}
      <span
        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black"
        style={{
          background: active ? "rgba(255,255,255,0.22)" : "rgba(188,78,32,0.12)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function RecordCard({
  children,
  alt,
}: {
  children: React.ReactNode;
  alt: boolean;
}) {
  return (
    <div
      className="rounded-[10px] px-3.5 py-3"
      style={{
        border: `1.5px solid ${BRAND.gold}`,
        background: alt ? BRAND.creamRow : "#ffffff",
      }}
    >
      {children}
    </div>
  );
}

function EmptyState({
  emoji,
  title,
  hint,
}: {
  emoji: string;
  title: string;
  hint: string;
}) {
  return (
    <div
      className="rounded-[10px] px-5 py-8 text-center"
      style={{ border: `1.5px dashed ${BRAND.gold}`, background: "#fff" }}
    >
      <p className="text-[28px] mb-1">{emoji}</p>
      <p className="text-[13px] font-extrabold" style={{ color: BRAND.ink }}>
        {title}
      </p>
      <p
        className="text-[11px] font-semibold mt-1 max-w-[300px] mx-auto"
        style={{ color: BRAND.inkSoft }}
      >
        {hint}
      </p>
    </div>
  );
}

function MiniStat({ es, value }: { es: string; value: string }) {
  return (
    <p className="text-[11px] font-bold" style={{ color: BRAND.ink }}>
      <span
        className="text-[8.5px] font-extrabold uppercase mr-1"
        style={{ color: BRAND.goldText, letterSpacing: "0.1em" }}
      >
        {es}
      </span>
      {value}
    </p>
  );
}

function Signature({ name }: { name: string }) {
  return (
    <div className="flex items-baseline justify-end gap-2 mt-1.5">
      <span
        className="text-[15px] leading-none"
        style={{
          color: BRAND.ink,
          fontFamily:
            '"Snell Roundhand", "Segoe Script", "Brush Script MT", cursive',
        }}
      >
        {name}
      </span>
      <span
        className="text-[8px] font-extrabold uppercase"
        style={{ color: BRAND.inkSoft, letterSpacing: "0.12em" }}
      >
        Vetsfriend
      </span>
    </div>
  );
}

/* ─── Sello circular ────────────────────────────────────────────── */

function PassportSeal({
  className,
  "aria-hidden": ariaHidden,
}: {
  className?: string;
  "aria-hidden"?: boolean;
}) {
  const paw = (
    <g fill="none" stroke={BRAND.orange} strokeWidth={2.4} strokeLinecap="round">
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="20" cy="16" r="2" />
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
    </g>
  );

  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      role={ariaHidden ? undefined : "img"}
      aria-hidden={ariaHidden}
      aria-label={
        ariaHidden ? undefined : "Cartilla de vacunación — Vaccine certificate"
      }
    >
      <defs>
        <clipPath id="carnet-seal-center">
          <circle cx="160" cy="160" r="82" />
        </clipPath>
        <path id="carnet-arc-top" d="M 42 160 A 118 118 0 0 1 278 160" fill="none" />
        <path id="carnet-arc-bottom" d="M 21 160 A 139 139 0 0 0 299 160" fill="none" />
      </defs>

      <circle cx="160" cy="160" r="150" fill="none" stroke={BRAND.orange} strokeWidth="2.5" />
      <circle
        cx="160"
        cy="160"
        r="100"
        fill="none"
        stroke={BRAND.orange}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="0.1 8.5"
      />

      <text fill={BRAND.orange} fontSize="19" fontWeight="800" letterSpacing="4" fontFamily="inherit">
        <textPath href="#carnet-arc-top" startOffset="50%" textAnchor="middle">
          CARTILLA DE VACUNACIÓN
        </textPath>
      </text>
      <text fill={BRAND.orange} fontSize="19" fontWeight="800" letterSpacing="4" fontFamily="inherit">
        <textPath href="#carnet-arc-bottom" startOffset="50%" textAnchor="middle">
          VACCINE CERTIFICATE
        </textPath>
      </text>

      <g transform="translate(18 148) scale(0.95)">{paw}</g>
      <g transform="translate(279 148) scale(0.95)">{paw}</g>

      <image
        href="/vetsfriend-icon.png"
        x="78"
        y="78"
        width="164"
        height="164"
        clipPath="url(#carnet-seal-center)"
      />
    </svg>
  );
}
