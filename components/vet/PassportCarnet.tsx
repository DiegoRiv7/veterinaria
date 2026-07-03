"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Pill, Syringe, X } from "lucide-react";

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

const MIN_ROWS = 5;

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

export function PassportCarnet({
  petName,
  vaccines,
  dewormings,
  initialOpen = false,
}: {
  petName: string;
  vaccines: CarnetVaccine[];
  dewormings: CarnetDeworming[];
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [opening, setOpening] = useState(false);

  function openPassport() {
    if (open || opening) return;
    setOpening(true);
    window.setTimeout(() => {
      setOpening(false);
      setOpen(true);
    }, 340);
  }

  // Al entrar a la página el pasaporte se abre solo: se alcanza a ver la
  // portada un instante y enseguida corre la animación de apertura.
  useEffect(() => {
    if (initialOpen) return;
    const t = window.setTimeout(openPassport, 750);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Cerrado: la portada ───────────────────────────────────── */
  if (!open) {
    return (
      <div className="flex flex-col items-center py-6">
        <button
          type="button"
          onClick={openPassport}
          aria-label="Abrir carnet de vacunación"
          className="group relative w-[420px] max-w-full text-left cursor-pointer transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[0.5deg]"
          style={{
            transformOrigin: "left center",
            animation: "passportCoverIn 0.5s ease-out both",
            ...(opening
              ? {
                  transition: "transform 0.34s ease-in, opacity 0.34s ease-in",
                  transform: "perspective(1400px) rotateY(-72deg)",
                  opacity: 0.2,
                }
              : {}),
          }}
        >
          {/* hojas asomando por el canto derecho */}
          <div
            aria-hidden
            className="absolute top-[8px] bottom-[8px] -right-[6px] w-[12px] rounded-r-[7px]"
            style={{
              background:
                "repeating-linear-gradient(to bottom, #fffdf9 0 3px, #efdccb 3px 4px)",
              boxShadow: "2px 2px 10px rgba(0,0,0,0.12)",
            }}
          />
          <div
            className="relative rounded-r-[18px] rounded-l-[10px] px-8 pt-14 pb-11 flex flex-col items-center overflow-hidden"
            style={{
              background: BRAND.cream,
              boxShadow:
                "0 22px 48px -18px rgba(122, 51, 16, 0.45), inset -16px 0 28px -22px rgba(122,51,16,0.5), inset 4px 0 0 rgba(122,51,16,0.18)",
            }}
          >
            <p
              className="text-[40px] font-black leading-none"
              style={{ color: BRAND.orange, letterSpacing: "0.05em" }}
            >
              PASAPORTE
            </p>
            <p
              className="text-[13px] font-extrabold mt-2"
              style={{
                color: BRAND.goldText,
                letterSpacing: "0.52em",
                textIndent: "0.52em",
              }}
            >
              PASSPORT
            </p>

            <PassportSeal className="w-[250px] my-10" />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vetsfriend-wordmark.png"
              alt="Vetsfriend"
              className="h-10 w-auto"
            />
            <p
              className="text-[10px] font-extrabold mt-1"
              style={{ color: BRAND.goldText, letterSpacing: "0.15em" }}
            >
              Clínica &amp; Grooming
            </p>

            <span
              className="mt-8 inline-flex items-center gap-1.5 h-9 px-5 rounded-full text-[12px] font-extrabold uppercase tracking-[0.08em] transition group-hover:brightness-105"
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
          Carnet de {petName} · toca la portada para abrirlo
        </p>
      </div>
    );
  }

  /* ─── Abierto: spread Vacunación + Desparasitación ──────────── */
  return (
    <div
      className="relative rounded-[22px] overflow-hidden"
      style={{
        background: BRAND.cream,
        boxShadow: "0 24px 52px -20px rgba(122, 51, 16, 0.4)",
        animation: "passportSpreadIn 0.5s ease-out both",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Cerrar carnet"
        className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full inline-flex items-center justify-center transition hover:brightness-110"
        style={{ background: "rgba(188,78,32,0.12)", color: BRAND.orange }}
      >
        <X size={16} strokeWidth={3} />
      </button>

      <div className="grid md:grid-cols-2 relative items-stretch">
        {/* Lomo central (solo desktop) */}
        <div
          aria-hidden
          className="hidden md:block absolute inset-y-0 left-1/2 w-[52px] -translate-x-1/2 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(122,51,16,0.15) 46%, rgba(122,51,16,0.22) 50%, rgba(122,51,16,0.15) 54%, transparent)",
          }}
        />

        {/* ── Página izquierda: Vacunación (clic = cerrar) ── */}
        <div
          onClick={() => setOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setOpen(false);
          }}
          aria-label="Cerrar carnet"
          title="Toca esta página para cerrar el carnet"
          className="relative px-6 sm:px-8 pt-6 pb-8 flex flex-col gap-4 cursor-pointer select-none"
          style={{
            transformOrigin: "right center",
            animation: "passportPageSettle 0.6s ease-out both",
          }}
        >
          <span
            className="self-start inline-flex items-center gap-1 h-7 px-3 rounded-full text-[10px] font-extrabold uppercase tracking-[0.08em]"
            style={{ background: "rgba(188,78,32,0.10)", color: BRAND.orange }}
          >
            <ChevronLeft size={12} strokeWidth={3} /> Cerrar carnet
          </span>

          <SectionBand title="Vacunación" titleEn="Vaccination">
            <Syringe size={20} strokeWidth={2.6} />
          </SectionBand>

          <ColumnLegend
            cols={[
              ["Fecha", "Date"],
              ["Vacuna · Peso", "Vaccine · Weight"],
              ["Firma · Próxima", "Signature · Booster"],
            ]}
          />

          <div className="flex flex-col gap-2.5">
            {vaccines.map((v, i) => (
              <RecordRow key={v.id} alt={i % 2 === 1}>
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className="text-[15px] font-extrabold leading-tight truncate"
                    style={{ color: BRAND.ink }}
                  >
                    {v.name}
                  </p>
                  <DateChip value={fmt(v.appliedAt)} />
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2">
                  <MiniStat
                    es="Peso"
                    en="Weight"
                    value={v.weightKg != null ? `${v.weightKg} kg` : "—"}
                  />
                  <MiniStat
                    es="Próxima"
                    en="Booster"
                    value={fmt(v.nextAt)}
                    highlight={Boolean(v.nextAt)}
                  />
                </div>
                {v.notes && (
                  <p
                    className="text-[11.5px] font-semibold mt-1.5 whitespace-pre-line"
                    style={{ color: BRAND.inkSoft }}
                  >
                    {v.notes}
                  </p>
                )}
                <Signature name={v.vetName} />
              </RecordRow>
            ))}
            {Array.from({
              length: Math.max(0, MIN_ROWS - vaccines.length),
            }).map((_, i) => (
              <EmptyRow key={`e-${i}`} alt={(vaccines.length + i) % 2 === 1} />
            ))}
          </div>

          {vaccines.length === 0 && <FillHint kind="vacunación" />}
        </div>

        {/* ── Página derecha: Desparasitación ── */}
        <div className="px-6 sm:px-8 pt-6 pb-8 flex flex-col gap-4">
          <div className="h-7 hidden md:block" aria-hidden />

          <SectionBand title="Desparasitación" titleEn="Deworming">
            <Pill size={20} strokeWidth={2.6} />
          </SectionBand>

          <ColumnLegend
            cols={[
              ["Fecha", "Date"],
              ["Productos · Dosis", "Product · Dosage"],
              ["Próxima", "Next"],
            ]}
          />

          <div className="flex flex-col gap-2.5">
            {dewormings.map((d, i) => (
              <RecordRow key={d.id} alt={i % 2 === 1}>
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className="text-[15px] font-extrabold leading-tight truncate"
                    style={{ color: BRAND.ink }}
                  >
                    {d.product}
                    {d.kind && (
                      <span
                        className="ml-2 align-middle inline-flex h-[19px] px-2 rounded-full text-[9.5px] font-extrabold uppercase tracking-[0.06em] items-center"
                        style={{
                          background: "rgba(188,78,32,0.10)",
                          color: BRAND.orange,
                        }}
                      >
                        {d.kind}
                      </span>
                    )}
                  </p>
                  <DateChip value={fmt(d.appliedAt)} />
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2">
                  <MiniStat
                    es="Próxima"
                    en="Next"
                    value={fmt(d.nextAt)}
                    highlight={Boolean(d.nextAt)}
                  />
                </div>
                {d.notes && (
                  <p
                    className="text-[11.5px] font-semibold mt-1.5 whitespace-pre-line"
                    style={{ color: BRAND.inkSoft }}
                  >
                    {d.notes}
                  </p>
                )}
                <Signature name={d.vetName} />
              </RecordRow>
            ))}
            {Array.from({
              length: Math.max(0, MIN_ROWS - dewormings.length),
            }).map((_, i) => (
              <EmptyRow
                key={`e-${i}`}
                alt={(dewormings.length + i) % 2 === 1}
              />
            ))}
          </div>

          {dewormings.length === 0 && <FillHint kind="desparasitación" />}
        </div>
      </div>

      {/* Banda inferior de marca */}
      <div
        className="h-14 flex flex-col items-center justify-center gap-0.5"
        style={{ background: BRAND.orange }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vetsfriend-wordmark-white.png"
          alt="Vetsfriend"
          className="h-6 w-auto"
        />
        <p
          className="text-[8px] font-extrabold"
          style={{ color: BRAND.goldText, letterSpacing: "0.18em" }}
        >
          Clínica &amp; Grooming
        </p>
      </div>
    </div>
  );
}

/* ─── Piezas ────────────────────────────────────────────────────── */

function SectionBand({
  title,
  titleEn,
  children,
}: {
  title: string;
  titleEn: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[10px] min-h-[52px] px-5 flex items-center justify-between text-white shrink-0"
      style={{ background: BRAND.orange }}
    >
      <p className="text-[19px] font-extrabold leading-none">
        {title}
        <span className="font-semibold opacity-80 text-[15px]"> / {titleEn}</span>
      </p>
      {children}
    </div>
  );
}

function ColumnLegend({ cols }: { cols: [string, string][] }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      {cols.map(([es, en]) => (
        <div key={es} className="text-center">
          <p
            className="text-[10.5px] font-extrabold uppercase leading-tight"
            style={{ color: BRAND.ink, letterSpacing: "0.04em" }}
          >
            {es}
          </p>
          <p
            className="text-[9.5px] font-semibold uppercase leading-tight"
            style={{ color: BRAND.inkSoft }}
          >
            {en}
          </p>
        </div>
      ))}
    </div>
  );
}

function RecordRow({
  children,
  alt,
}: {
  children: React.ReactNode;
  alt: boolean;
}) {
  return (
    <div
      className="rounded-[12px] px-4 py-3"
      style={{
        border: `1.5px solid ${BRAND.gold}`,
        background: alt ? BRAND.creamRow : "#ffffff",
      }}
    >
      {children}
    </div>
  );
}

function EmptyRow({ alt }: { alt: boolean }) {
  return (
    <div
      aria-hidden
      className="rounded-[12px] h-[56px]"
      style={{
        border: `1.5px solid ${BRAND.gold}`,
        background: alt ? BRAND.creamRow : "#ffffff",
        opacity: 0.75,
      }}
    />
  );
}

function DateChip({ value }: { value: string }) {
  return (
    <span
      className="shrink-0 inline-flex items-center h-[24px] px-2.5 rounded-full text-[11.5px] font-extrabold"
      style={{ background: "rgba(235,183,71,0.22)", color: BRAND.orange }}
    >
      {value}
    </span>
  );
}

function MiniStat({
  es,
  en,
  value,
  highlight = false,
}: {
  es: string;
  en: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <p
      className="text-[12.5px] font-bold"
      style={{ color: highlight ? BRAND.orange : BRAND.ink }}
    >
      <span
        className="text-[9px] font-extrabold uppercase mr-1.5"
        style={{ color: BRAND.goldText, letterSpacing: "0.1em" }}
        title={en}
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
        className="text-[16px] leading-none"
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

function FillHint({ kind }: { kind: string }) {
  return (
    <p
      className="text-[11.5px] font-semibold text-center"
      style={{ color: BRAND.inkSoft }}
    >
      Este carnet se llena automáticamente al terminar una consulta de {kind}{" "}
      con la casilla “Agregar al carnet” marcada.
    </p>
  );
}

/* ─── Sello circular ────────────────────────────────────────────── */

function PassportSeal({ className }: { className?: string }) {
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
      role="img"
      aria-label="Cartilla de vacunación — Vaccine certificate"
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
