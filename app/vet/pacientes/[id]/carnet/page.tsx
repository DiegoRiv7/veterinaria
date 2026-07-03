import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pill, Syringe } from "lucide-react";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { BackLink } from "@/components/BackLink";
import { PetAvatar } from "@/components/PetAvatar";
import { SPECIES_LABEL, ageFromBirthDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/* Brand palette sampled from the printed Vetsfriend passport */
const BRAND = {
  orange: "#BC4E20", // bands + seal + títulos
  gold: "#EBB747", // bordes de las celdas
  goldText: "#E9A83A", // "PASSPORT" y tagline
  cream: "#FCECE3", // fondo de portada (mismo px que los PNG del logo)
  creamRow: "#FBEDE2", // filas alternas
  ink: "#4A4A4A",
  inkSoft: "#A5A5A5",
};

const MIN_ROWS = 6;

function fmt(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(".", "");
}

export default async function VetPetCarnetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const { id } = await params;
  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      vaccines: {
        include: { addedBy: { select: { name: true } } },
        orderBy: { appliedAt: "asc" },
      },
      dewormings: {
        include: { addedBy: { select: { name: true } } },
        orderBy: { appliedAt: "asc" },
      },
    },
  });
  if (!pet) notFound();

  const age = ageFromBirthDate(pet.birthDate) ?? "—";

  return (
    <div className="flex flex-col gap-5 max-w-[860px] mx-auto w-full pb-8">
      <BackLink
        fallbackHref={`/vet/pacientes/${pet.id}`}
        className="inline-flex items-center gap-1 text-[13px] font-extrabold no-underline self-start"
        style={{ color: "var(--vet-green)" }}
      >
        <ChevronLeft size={14} /> Volver
      </BackLink>

      {/* Identidad de la mascota */}
      <div
        className="rounded-[16px] border p-4 flex items-center gap-3"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          boxShadow: "var(--shadow-soft-sm)",
        }}
      >
        <PetAvatar
          photoUrl={pet.photoUrl}
          species={pet.species}
          name={pet.name}
          size="lg"
        />
        <div className="min-w-0">
          <p
            className="text-[11px] font-extrabold uppercase tracking-[0.08em]"
            style={{ color: "var(--vet-text-3)" }}
          >
            Carnet de vacunación
          </p>
          <p
            className="text-[18px] font-black leading-tight truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            {pet.name}
          </p>
          <p
            className="text-[12px] font-semibold truncate"
            style={{ color: "var(--vet-text-3)" }}
          >
            {SPECIES_LABEL[pet.species]}
            {pet.breed ? ` · ${pet.breed}` : ""} · {age}
            {pet.owner ? ` · 👤 ${pet.owner.name}` : ""}
          </p>
        </div>
      </div>

      {/* ─── Portada del pasaporte ─────────────────────────── */}
      <section
        className="rounded-[22px] overflow-hidden flex flex-col items-center px-6 py-12 sm:py-14"
        style={{ background: BRAND.cream, boxShadow: "var(--shadow-soft-sm)" }}
      >
        <h2
          className="text-[40px] sm:text-[48px] font-black leading-none"
          style={{ color: BRAND.orange, letterSpacing: "0.05em" }}
        >
          PASAPORTE
        </h2>
        <p
          className="text-[15px] font-extrabold mt-2"
          style={{ color: BRAND.goldText, letterSpacing: "0.55em", textIndent: "0.55em" }}
        >
          PASSPORT
        </p>

        <PassportSeal className="w-[260px] sm:w-[300px] my-10 sm:my-12" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vetsfriend-wordmark.png"
          alt="Vetsfriend"
          className="h-11 w-auto"
        />
        <p
          className="text-[11px] font-extrabold mt-1"
          style={{ color: BRAND.goldText, letterSpacing: "0.14em" }}
        >
          Clínica &amp; Grooming
        </p>
      </section>

      {/* ─── Hoja: Vacunación ──────────────────────────────── */}
      <CarnetSheet
        title="Vacunación"
        titleEn="Vaccination"
        icon={<Syringe size={22} strokeWidth={2.5} />}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[680px] flex flex-col gap-2">
            <div className="grid grid-cols-[96px_1.2fr_76px_1fr_112px] gap-x-[2px]">
              <ColHeader es="Fecha" en="Date" />
              <ColHeader es="Vacuna" en="Vaccine" />
              <ColHeader es="Peso" en="Weight" />
              <ColHeader es="Firma del veterinario" en="Veterinary signature" />
              <ColHeader es="Próxima vacuna" en="Booster date" />
            </div>
            {Array.from(
              { length: Math.max(MIN_ROWS, pet.vaccines.length) },
              (_, i) => {
                const v = pet.vaccines[i];
                return (
                  <div
                    key={v?.id ?? `empty-${i}`}
                    className="grid grid-cols-[96px_1.2fr_76px_1fr_112px] min-h-[62px] rounded-[3px]"
                    style={{
                      border: `1.5px solid ${BRAND.gold}`,
                      background: i % 2 === 1 ? BRAND.creamRow : "#ffffff",
                    }}
                  >
                    <Cell first>{v ? fmt(v.appliedAt) : null}</Cell>
                    <Cell>
                      {v && (
                        <>
                          <span
                            className="text-[13px] font-extrabold leading-tight"
                            style={{ color: BRAND.ink }}
                          >
                            {v.name}
                          </span>
                          {v.notes && (
                            <span
                              className="text-[10px] font-semibold leading-tight mt-0.5 line-clamp-2"
                              style={{ color: BRAND.inkSoft }}
                            >
                              {v.notes}
                            </span>
                          )}
                        </>
                      )}
                    </Cell>
                    <Cell>{v?.weightKg != null ? `${v.weightKg} kg` : null}</Cell>
                    <Cell>
                      {v && (
                        <>
                          <span
                            className="text-[16px] leading-tight"
                            style={{
                              color: BRAND.ink,
                              fontFamily:
                                '"Snell Roundhand", "Segoe Script", "Brush Script MT", cursive',
                            }}
                          >
                            {v.addedBy.name}
                          </span>
                          <span
                            className="text-[9px] font-extrabold uppercase tracking-[0.1em] mt-0.5"
                            style={{ color: BRAND.inkSoft }}
                          >
                            Vetsfriend
                          </span>
                        </>
                      )}
                    </Cell>
                    <Cell>{v ? fmt(v.nextAt) : null}</Cell>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </CarnetSheet>

      {/* ─── Hoja: Desparasitación ─────────────────────────── */}
      <CarnetSheet
        title="Desparasitación"
        titleEn="Deworming"
        icon={<Pill size={22} strokeWidth={2.5} />}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[560px] flex flex-col gap-2">
            <div className="grid grid-cols-[96px_1.4fr_112px] gap-x-[2px]">
              <ColHeader es="Fecha" en="Date" />
              <ColHeader es="Productos/Dosis" en="Product/Dosage" />
              <ColHeader es="Próxima" en="Next" />
            </div>
            {Array.from(
              { length: Math.max(MIN_ROWS, pet.dewormings.length) },
              (_, i) => {
                const d = pet.dewormings[i];
                return (
                  <div
                    key={d?.id ?? `empty-${i}`}
                    className="grid grid-cols-[96px_1.4fr_112px] min-h-[62px] rounded-[3px]"
                    style={{
                      border: `1.5px solid ${BRAND.gold}`,
                      background: i % 2 === 1 ? BRAND.creamRow : "#ffffff",
                    }}
                  >
                    <Cell first>{d ? fmt(d.appliedAt) : null}</Cell>
                    <Cell>
                      {d && (
                        <>
                          <span
                            className="text-[13px] font-extrabold leading-tight"
                            style={{ color: BRAND.ink }}
                          >
                            {d.product}
                            {d.kind ? ` · ${d.kind}` : ""}
                          </span>
                          {d.notes && (
                            <span
                              className="text-[10px] font-semibold leading-tight mt-0.5 line-clamp-2"
                              style={{ color: BRAND.inkSoft }}
                            >
                              {d.notes}
                            </span>
                          )}
                        </>
                      )}
                    </Cell>
                    <Cell>{d ? fmt(d.nextAt) : null}</Cell>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </CarnetSheet>
    </div>
  );
}

/* ─── Página del carnet (header naranja + footer con logo) ──────── */

function CarnetSheet({
  title,
  titleEn,
  icon,
  children,
}: {
  title: string;
  titleEn: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-[22px] overflow-hidden bg-white flex flex-col"
      style={{ boxShadow: "var(--shadow-soft-sm)" }}
    >
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        <div
          className="rounded-[6px] h-14 px-5 flex items-center justify-between text-white"
          style={{ background: BRAND.orange }}
        >
          <p className="text-[20px] sm:text-[22px] font-extrabold leading-none">
            {title}
            <span className="font-semibold opacity-85">/ {titleEn}</span>
          </p>
          {icon}
        </div>
        {children}
      </div>
      <div
        className="h-16 flex flex-col items-center justify-center gap-0.5"
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
          style={{ color: BRAND.goldText, letterSpacing: "0.16em" }}
        >
          Clínica &amp; Grooming
        </p>
      </div>
    </section>
  );
}

function ColHeader({ es, en }: { es: string; en: string }) {
  return (
    <div className="text-center pb-1">
      <p
        className="text-[11px] font-extrabold uppercase leading-tight"
        style={{ color: BRAND.ink, letterSpacing: "0.02em" }}
      >
        {es}
      </p>
      <p
        className="text-[10px] font-semibold uppercase leading-tight"
        style={{ color: BRAND.inkSoft }}
      >
        {en}
      </p>
    </div>
  );
}

function Cell({
  children,
  first = false,
}: {
  children?: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      className="px-2 py-2 flex flex-col items-center justify-center text-center text-[12px] font-bold"
      style={{
        color: BRAND.ink,
        borderLeft: first ? "none" : `1.5px solid ${BRAND.gold}`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Sello circular de la portada ──────────────────────────────── */

function PassportSeal({ className }: { className?: string }) {
  // Trazo de huella tomado de lucide (paw-print) para conservar la marca.
  const paw = (
    <g fill="none" stroke={BRAND.orange} strokeWidth={2.4} strokeLinecap="round">
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="20" cy="16" r="2" />
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
    </g>
  );

  return (
    <svg viewBox="0 0 320 320" className={className} role="img" aria-label="Cartilla de vacunación — Vaccine certificate">
      <defs>
        <clipPath id="seal-center">
          <circle cx="160" cy="160" r="82" />
        </clipPath>
        {/* Arco superior: el texto crece hacia afuera desde r=118 */}
        <path id="seal-arc-top" d="M 42 160 A 118 118 0 0 1 278 160" fill="none" />
        {/* Arco inferior: recorrido por abajo de izq→der para que se lea derecho */}
        <path id="seal-arc-bottom" d="M 21 160 A 139 139 0 0 0 299 160" fill="none" />
      </defs>

      {/* Anillo exterior */}
      <circle cx="160" cy="160" r="150" fill="none" stroke={BRAND.orange} strokeWidth="2.5" />
      {/* Anillo punteado interior */}
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

      <text
        fill={BRAND.orange}
        fontSize="19"
        fontWeight="800"
        letterSpacing="4"
        fontFamily="inherit"
      >
        <textPath href="#seal-arc-top" startOffset="50%" textAnchor="middle">
          CARTILLA DE VACUNACIÓN
        </textPath>
      </text>
      <text
        fill={BRAND.orange}
        fontSize="19"
        fontWeight="800"
        letterSpacing="4"
        fontFamily="inherit"
      >
        <textPath href="#seal-arc-bottom" startOffset="50%" textAnchor="middle">
          VACCINE CERTIFICATE
        </textPath>
      </text>

      {/* Huellas a los costados */}
      <g transform="translate(18 148) scale(0.95)">{paw}</g>
      <g transform="translate(279 148) scale(0.95)">{paw}</g>

      {/* Logo al centro */}
      <image
        href="/vetsfriend-icon.png"
        x="78"
        y="78"
        width="164"
        height="164"
        clipPath="url(#seal-center)"
      />
    </svg>
  );
}
