"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Pill, Syringe, X } from "lucide-react";
import {
  saveCarnetVaccineAction,
  saveCarnetDewormingAction,
} from "@/app/actions/carnet";

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

const PAGE_SIZE = 5;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const VACCINE_OPTIONS = [
  "Pentavalente",
  "Antirrábica",
  "Triple felina",
  "Leucemia felina",
  "Bordetella (KC)",
  "Influenza canina",
  "Giardia",
];

const DEWORM_OPTIONS = [
  "Drontal Plus",
  "Milbemax",
  "Endogard",
  "Cestal Plus",
  "Panacur (Fenbendazol)",
  "Frontline Plus",
  "Bravecto",
  "NexGard",
  "Advantix",
  "Simparica",
];

const OTHER = "__otro__";

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

type Section = "vac" | "dew";

type Draft = {
  name: string; // valor del select (o OTHER)
  nameOther: string;
  kind: string;
  appliedAt: string; // YYYY-MM-DD
  nextAt: string;
  weightKg: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  nameOther: "",
  kind: "",
  appliedAt: "",
  nextAt: "",
  weightKg: "",
  notes: "",
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

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function todayInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function PassportCarnet({
  petId,
  petName,
  vaccines,
  dewormings,
  initialOpen = true,
}: {
  petId: string;
  petName: string;
  vaccines: CarnetVaccine[];
  dewormings: CarnetDeworming[];
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [vacPage, setVacPage] = useState(0);
  const [dewPage, setDewPage] = useState(0);

  // Edición inline: qué registro se está editando (id null = nuevo)
  const [editing, setEditing] = useState<{ section: Section; id: string | null } | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openPassport() {
    if (open || opening) return;
    setOpening(true);
    window.setTimeout(() => {
      setOpening(false);
      setOpen(true);
    }, 260);
  }

  function closePassport() {
    if (closing) return;
    setEditing(null);
    setError(null);
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setOpen(false);
    }, 600);
  }

  function startEdit(section: Section, record: CarnetVaccine | CarnetDeworming | null) {
    setError(null);
    if (!record) {
      setEditing({ section, id: null });
      setDraft({ ...EMPTY_DRAFT, appliedAt: todayInput() });
      return;
    }
    const isVac = section === "vac";
    const name = isVac
      ? (record as CarnetVaccine).name
      : (record as CarnetDeworming).product;
    const options = isVac ? VACCINE_OPTIONS : DEWORM_OPTIONS;
    setEditing({ section, id: record.id });
    setDraft({
      name: options.includes(name) ? name : OTHER,
      nameOther: options.includes(name) ? "" : name,
      kind: !isVac ? ((record as CarnetDeworming).kind ?? "") : "",
      appliedAt: toDateInput(record.appliedAt),
      nextAt: toDateInput(record.nextAt),
      weightKg: isVac
        ? ((record as CarnetVaccine).weightKg != null
            ? String((record as CarnetVaccine).weightKg)
            : "")
        : "",
      notes: record.notes ?? "",
    });
  }

  async function save() {
    if (!editing || saving) return;
    const resolvedName = draft.name === OTHER ? draft.nameOther.trim() : draft.name;
    setSaving(true);
    setError(null);
    const res =
      editing.section === "vac"
        ? await saveCarnetVaccineAction({
            id: editing.id,
            petId,
            name: resolvedName,
            appliedAt: draft.appliedAt,
            nextAt: draft.nextAt || null,
            weightKg: draft.weightKg ? Number(draft.weightKg) : null,
            notes: draft.notes || null,
          })
        : await saveCarnetDewormingAction({
            id: editing.id,
            petId,
            product: resolvedName,
            kind: draft.kind || null,
            appliedAt: draft.appliedAt,
            nextAt: draft.nextAt || null,
            notes: draft.notes || null,
          });
    setSaving(false);
    if (res.ok) {
      setEditing(null);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  /* ─── Cerrado: la portada ───────────────────────────────────── */
  if (!open) {
    return (
      <div className="flex flex-col items-center py-6">
        <button
          type="button"
          onClick={openPassport}
          aria-label="Abrir carnet de vacunación"
          className="group relative w-[420px] max-w-full md:w-full text-left cursor-pointer transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[0.3deg] will-change-transform"
          style={{
            transformOrigin: "left center",
            animation: `passportCoverIn 0.4s ${EASE} both`,
            ...(opening
              ? {
                  transition: "transform 0.24s ease-in, opacity 0.24s ease-in",
                  transform: "perspective(1400px) rotateY(-72deg)",
                  opacity: 0.15,
                }
              : {}),
          }}
        >
          {/* Portada vertical (celular) */}
          <div
            aria-hidden
            className="md:hidden absolute top-[8px] bottom-[8px] -right-[6px] w-[12px] rounded-r-[7px]"
            style={{
              background:
                "repeating-linear-gradient(to bottom, #fffdf9 0 3px, #efdccb 3px 4px)",
              boxShadow: "2px 2px 10px rgba(0,0,0,0.12)",
            }}
          />
          <div
            className="md:hidden relative rounded-r-[18px] rounded-l-[10px] px-8 pt-14 pb-11 flex flex-col items-center overflow-hidden"
            style={{
              background: BRAND.cream,
              boxShadow:
                "0 22px 48px -18px rgba(122, 51, 16, 0.45), inset -16px 0 28px -22px rgba(122,51,16,0.5), inset 4px 0 0 rgba(122,51,16,0.18)",
            }}
          >
            <p
              className="text-[42px] font-black leading-none"
              style={{ color: BRAND.orange, letterSpacing: "0.06em" }}
            >
              CARNET
            </p>
            <p
              className="text-[13px] font-extrabold mt-2"
              style={{
                color: BRAND.goldText,
                letterSpacing: "0.52em",
                textIndent: "0.52em",
              }}
            >
              CARD
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

          {/* Portada horizontal (computadora) — dos mitades, como el inicio */}
          <div
            className="hidden md:grid relative rounded-[22px] grid-cols-2 min-h-[460px] overflow-hidden"
            style={{
              background: BRAND.cream,
              boxShadow:
                "0 24px 52px -20px rgba(122, 51, 16, 0.45), inset 4px 0 0 rgba(122,51,16,0.14)",
            }}
          >
            {/* Mitad izquierda: el logo */}
            <div className="flex items-center justify-center py-12">
              <PassportSeal className="w-[320px] lg:w-[340px]" />
            </div>

            {/* Mitad derecha: nombre + CARNET + botón */}
            <div className="flex flex-col items-center justify-center gap-0 py-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/vetsfriend-wordmark.png"
                alt="Vetsfriend"
                className="h-11 w-auto"
              />
              <p
                className="text-[11px] font-extrabold mt-1"
                style={{ color: BRAND.goldText, letterSpacing: "0.15em" }}
              >
                Clínica &amp; Grooming
              </p>

              <p
                className="text-[56px] font-black leading-none mt-10"
                style={{ color: BRAND.orange, letterSpacing: "0.06em" }}
              >
                CARNET
              </p>
              <p
                className="text-[15px] font-extrabold mt-2.5"
                style={{
                  color: BRAND.goldText,
                  letterSpacing: "0.52em",
                  textIndent: "0.52em",
                }}
              >
                CARD
              </p>

              <span
                className="mt-11 inline-flex items-center gap-1.5 h-10 px-6 rounded-full text-[12.5px] font-extrabold uppercase tracking-[0.08em] transition group-hover:brightness-105"
                style={{
                  background: BRAND.orange,
                  color: "#fff",
                  boxShadow: "0 6px 14px -6px rgba(122,51,16,0.5)",
                }}
              >
                Abrir carnet <span aria-hidden>→</span>
              </span>
            </div>
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
  const vacTotalPages = pagesFor(vaccines.length);
  const dewTotalPages = pagesFor(dewormings.length);
  const vp = Math.min(vacPage, vacTotalPages - 1);
  const dp = Math.min(dewPage, dewTotalPages - 1);
  const vacSlice = vaccines.slice(vp * PAGE_SIZE, (vp + 1) * PAGE_SIZE);
  const dewSlice = dewormings.slice(dp * PAGE_SIZE, (dp + 1) * PAGE_SIZE);

  return (
    <div
      className={`relative rounded-[22px] overflow-hidden will-change-transform ${
        closing
          ? "max-md:animate-[passportSpreadOut_0.3s_ease-in_both]"
          : ""
      }`}
      style={{
        background: BRAND.cream,
        boxShadow: "0 24px 52px -20px rgba(122, 51, 16, 0.4)",
        transformOrigin: "left center",
        // Al cerrar, en desktop el pliegue lo hace la página derecha
        // (tipo libro); en móvil el spread completo se retira.
        ...(closing ? {} : { animation: `passportSpreadIn 0.4s ${EASE} both` }),
      }}
    >
      <div
        className="grid grid-cols-1 md:grid-cols-2 relative items-stretch"
        style={{ perspective: "1800px" }}
      >
        {/* Lomo central (solo desktop) */}
        <div
          aria-hidden
          className="hidden md:block absolute inset-y-0 left-1/2 w-[52px] -translate-x-1/2 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(122,51,16,0.15) 46%, rgba(122,51,16,0.22) 50%, rgba(122,51,16,0.15) 54%, transparent)",
          }}
        />

        {/* ── Página izquierda: Vacunación ── */}
        <div
          className="relative px-4 sm:px-8 pt-5 pb-8 flex flex-col gap-3.5"
          style={{
            transformOrigin: "right center",
            animation: `passportPageSettle 0.4s ${EASE} both`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 min-h-[32px]">
            <button
              type="button"
              onClick={closePassport}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[10.5px] font-extrabold uppercase tracking-[0.08em] transition hover:brightness-95 cursor-pointer"
              style={{ background: "rgba(188,78,32,0.10)", color: BRAND.orange }}
            >
              <ChevronLeft size={12} strokeWidth={3} />
              Cerrar <span className="hidden sm:inline">carnet</span>
            </button>
            <PageNav
              page={vp}
              total={vacTotalPages}
              onPrev={() => setVacPage(vp - 1)}
              onNext={() => setVacPage(vp + 1)}
            />
          </div>

          <SectionBand title="Vacunación" titleEn="Vaccination">
            <Syringe size={20} strokeWidth={2.6} />
          </SectionBand>

          <ColumnLegend
            gridClass="sm:grid-cols-[1.5fr_1fr_0.7fr_1fr]"
            cols={[
              ["Vacuna", "Vaccine"],
              ["Fecha", "Date"],
              ["Peso", "Weight"],
              ["Próxima", "Booster"],
            ]}
          />

          <div className="flex flex-col gap-2.5">
            {vacSlice.map((v, i) => {
              const isEditing = editing?.section === "vac" && editing.id === v.id;
              return isEditing ? (
                <EditVaccineRow
                  key={v.id}
                  draft={draft}
                  setDraft={setDraft}
                  saving={saving}
                  error={error}
                  onSave={save}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <RecordShell key={v.id} alt={i % 2 === 1} onClick={() => startEdit("vac", v)}>
                  <div className="grid grid-cols-2 sm:grid-cols-[1.5fr_1fr_0.7fr_1fr] gap-1.5 items-stretch">
                    <FieldBox label="Vacuna">
                      <span
                        className="text-[14px] font-extrabold leading-tight"
                        style={{ color: BRAND.ink }}
                      >
                        {v.name}
                      </span>
                    </FieldBox>
                    <FieldBox label="Fecha">
                      <span className="text-[12.5px] font-bold" style={{ color: BRAND.ink }}>
                        {fmt(v.appliedAt)}
                      </span>
                    </FieldBox>
                    <FieldBox label="Peso">
                      <span className="text-[12.5px] font-bold" style={{ color: BRAND.ink }}>
                        {v.weightKg != null ? `${v.weightKg} kg` : "—"}
                      </span>
                    </FieldBox>
                    <FieldBox label="Próxima">
                      <span
                        className="text-[12.5px] font-bold"
                        style={{ color: v.nextAt ? BRAND.orange : BRAND.ink }}
                      >
                        {fmt(v.nextAt)}
                      </span>
                    </FieldBox>
                    {/* Firma justo debajo y alineada con la fecha */}
                    <div className="col-span-2 sm:col-span-1 sm:col-start-2 flex justify-end sm:justify-center">
                      <Signature name={v.vetName} />
                    </div>
                  </div>
                  {v.notes && (
                    <p
                      className="text-[11px] font-semibold mt-1 px-1 whitespace-pre-line"
                      style={{ color: BRAND.inkSoft }}
                    >
                      {v.notes}
                    </p>
                  )}
                </RecordShell>
              );
            })}

            {/* Ranuras vacías → clic para llenar manualmente */}
            {Array.from({ length: Math.max(0, PAGE_SIZE - vacSlice.length) }).map((_, i) => {
              const isNewHere =
                editing?.section === "vac" && editing.id === null && i === 0;
              return isNewHere ? (
                <EditVaccineRow
                  key={`new-${i}`}
                  draft={draft}
                  setDraft={setDraft}
                  saving={saving}
                  error={error}
                  onSave={save}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <EmptySlot
                  key={`e-${i}`}
                  alt={(vacSlice.length + i) % 2 === 1}
                  onClick={() => startEdit("vac", null)}
                />
              );
            })}
          </div>
        </div>

        {/* ── Página derecha: Desparasitación ──
            Al cerrar, gira 180° sobre el lomo y cae encima de la página
            izquierda, mostrando su reverso — como cerrar un libro. */}
        <div
          className={`relative z-20 will-change-transform ${
            closing
              ? "md:animate-[passportPageFold_0.6s_cubic-bezier(0.6,0.05,0.3,1)_both]"
              : ""
          }`}
          style={{
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
          }}
        >
          <div className="px-4 sm:px-8 pt-5 pb-8 flex flex-col gap-3.5 h-full [backface-visibility:hidden]">
          <div className="flex flex-wrap items-center justify-end gap-2 min-h-[32px]">
            <PageNav
              page={dp}
              total={dewTotalPages}
              onPrev={() => setDewPage(dp - 1)}
              onNext={() => setDewPage(dp + 1)}
            />
          </div>

          <SectionBand title="Desparasitación" titleEn="Deworming">
            <Pill size={20} strokeWidth={2.6} />
          </SectionBand>

          <ColumnLegend
            gridClass="sm:grid-cols-[1.6fr_1fr_1fr]"
            cols={[
              ["Producto · Dosis", "Product · Dosage"],
              ["Fecha", "Date"],
              ["Próxima", "Next"],
            ]}
          />

          <div className="flex flex-col gap-2.5">
            {dewSlice.map((d, i) => {
              const isEditing = editing?.section === "dew" && editing.id === d.id;
              return isEditing ? (
                <EditDewormingRow
                  key={d.id}
                  draft={draft}
                  setDraft={setDraft}
                  saving={saving}
                  error={error}
                  onSave={save}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <RecordShell key={d.id} alt={i % 2 === 1} onClick={() => startEdit("dew", d)}>
                  <div className="grid grid-cols-2 sm:grid-cols-[1.6fr_1fr_1fr] gap-1.5 items-stretch">
                    <FieldBox label="Producto">
                      <span
                        className="text-[14px] font-extrabold leading-tight"
                        style={{ color: BRAND.ink }}
                      >
                        {d.product}
                      </span>
                      {d.kind && (
                        <span
                          className="ml-2 inline-flex h-[18px] px-2 rounded-full text-[9px] font-extrabold uppercase tracking-[0.06em] items-center align-middle"
                          style={{
                            background: "rgba(188,78,32,0.10)",
                            color: BRAND.orange,
                          }}
                        >
                          {d.kind}
                        </span>
                      )}
                    </FieldBox>
                    <FieldBox label="Fecha">
                      <span className="text-[12.5px] font-bold" style={{ color: BRAND.ink }}>
                        {fmt(d.appliedAt)}
                      </span>
                    </FieldBox>
                    <FieldBox label="Próxima">
                      <span
                        className="text-[12.5px] font-bold"
                        style={{ color: d.nextAt ? BRAND.orange : BRAND.ink }}
                      >
                        {fmt(d.nextAt)}
                      </span>
                    </FieldBox>
                    {/* Firma justo debajo y alineada con la fecha */}
                    <div className="col-span-2 sm:col-span-1 sm:col-start-2 flex justify-end sm:justify-center">
                      <Signature name={d.vetName} />
                    </div>
                  </div>
                  {d.notes && (
                    <p
                      className="text-[11px] font-semibold mt-1 px-1 whitespace-pre-line"
                      style={{ color: BRAND.inkSoft }}
                    >
                      {d.notes}
                    </p>
                  )}
                </RecordShell>
              );
            })}

            {Array.from({ length: Math.max(0, PAGE_SIZE - dewSlice.length) }).map((_, i) => {
              const isNewHere =
                editing?.section === "dew" && editing.id === null && i === 0;
              return isNewHere ? (
                <EditDewormingRow
                  key={`new-${i}`}
                  draft={draft}
                  setDraft={setDraft}
                  saving={saving}
                  error={error}
                  onSave={save}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <EmptySlot
                  key={`e-${i}`}
                  alt={(dewSlice.length + i) % 2 === 1}
                  onClick={() => startEdit("dew", null)}
                />
              );
            })}
            </div>
          </div>

          {/* Reverso de la página (se ve durante el volteo) */}
          <div
            aria-hidden
            className="hidden md:flex absolute inset-0 items-center justify-center [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg)", background: BRAND.cream }}
          >
            <PassportSeal className="w-[240px] opacity-90" />
          </div>
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

/* ─── Paginación ────────────────────────────────────────────────── */

function pagesFor(count: number): number {
  if (count === 0) return 1;
  // Si la última página quedó llena, se crea una nueva en automático
  // para seguir capturando.
  return Math.ceil(count / PAGE_SIZE) + (count % PAGE_SIZE === 0 ? 1 : 0);
}

function PageNav({
  page,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-1.5">
      {page > 0 && (
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-0.5 h-8 px-2.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-[0.06em] transition hover:brightness-95 cursor-pointer"
          style={{ background: "rgba(188,78,32,0.10)", color: BRAND.orange }}
        >
          <ChevronLeft size={12} strokeWidth={3} /> Anterior
        </button>
      )}
      <span
        className="text-[10.5px] font-extrabold"
        style={{ color: BRAND.inkSoft }}
      >
        Pág. {page + 1}/{total}
      </span>
      {page < total - 1 && (
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-0.5 h-8 px-2.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-[0.06em] transition hover:brightness-110 cursor-pointer"
          style={{ background: BRAND.orange, color: "#fff" }}
        >
          Siguiente <span className="hidden sm:inline">página</span>
          <ChevronRight size={12} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

/* ─── Piezas de la página ───────────────────────────────────────── */

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
      <p className="text-[18px] sm:text-[19px] font-extrabold leading-none">
        {title}
        <span className="font-semibold opacity-80 text-[14px] sm:text-[15px]"> / {titleEn}</span>
      </p>
      {children}
    </div>
  );
}

function ColumnLegend({
  cols,
  gridClass,
}: {
  cols: [string, string][];
  gridClass: string;
}) {
  return (
    <div className={`hidden sm:grid ${gridClass} gap-1.5 px-4`}>
      {cols.map(([es, en]) => (
        <div key={es} className="text-center min-w-0">
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

function RecordShell({
  children,
  alt,
  onClick,
}: {
  children: React.ReactNode;
  alt: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      title="Toca para editar"
      className="rounded-[12px] px-2.5 py-2.5 cursor-pointer transition hover:brightness-[0.985]"
      style={{
        border: `1.5px solid ${BRAND.gold}`,
        background: alt ? BRAND.creamRow : "#ffffff",
      }}
    >
      {children}
    </div>
  );
}

/** Cada dato vive en su propia caja delimitada (visible al pasar el cursor). */
function FieldBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[8px] border border-transparent hover:border-[rgba(235,183,71,0.7)] px-1.5 py-1 transition-colors min-w-0"
    >
      <p
        className="sm:hidden text-[8.5px] font-extrabold uppercase mb-0.5"
        style={{ color: BRAND.goldText, letterSpacing: "0.1em" }}
      >
        {label}
      </p>
      <div className="truncate sm:text-center">{children}</div>
    </div>
  );
}

function EmptySlot({ alt, onClick }: { alt: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Toca para llenar manualmente"
      className="group rounded-[12px] h-[54px] w-full cursor-pointer transition flex items-center justify-center"
      style={{
        border: `1.5px solid ${BRAND.gold}`,
        background: alt ? BRAND.creamRow : "#ffffff",
        opacity: 0.8,
      }}
    >
      <span
        className="opacity-0 group-hover:opacity-100 transition text-[11px] font-extrabold uppercase tracking-[0.08em]"
        style={{ color: BRAND.goldText }}
      >
        + Llenar manualmente
      </span>
    </button>
  );
}

function Signature({ name }: { name: string }) {
  return (
    <span
      className="text-[15px] leading-none px-1 truncate"
      style={{
        color: BRAND.ink,
        fontFamily:
          '"Snell Roundhand", "Segoe Script", "Brush Script MT", cursive',
      }}
    >
      {name}
    </span>
  );
}

/* ─── Formularios inline ────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  border: `1.5px solid ${BRAND.gold}`,
  background: "#fff",
  color: BRAND.ink,
};

function EditLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[8.5px] font-extrabold uppercase mb-1"
      style={{ color: BRAND.goldText, letterSpacing: "0.1em" }}
    >
      {children}
    </p>
  );
}

function EditActions({
  saving,
  error,
  onSave,
  onCancel,
}: {
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mt-2.5">
      <p className="text-[11px] font-bold min-w-0 truncate" style={{ color: "#C0392B" }}>
        {error ?? ""}
      </p>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1 h-9 px-3.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.06em] transition hover:brightness-95 cursor-pointer disabled:opacity-50"
          style={{ background: "rgba(74,74,74,0.08)", color: BRAND.ink }}
        >
          <X size={12} strokeWidth={3} /> Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1 h-9 px-4 rounded-full text-[11px] font-extrabold uppercase tracking-[0.06em] transition hover:brightness-110 cursor-pointer disabled:opacity-60"
          style={{ background: BRAND.orange, color: "#fff" }}
        >
          <Check size={13} strokeWidth={3} /> {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function EditVaccineRow({
  draft,
  setDraft,
  saving,
  error,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="rounded-[12px] px-3 py-3"
      style={{ border: `2px solid ${BRAND.orange}`, background: "#fff" }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="col-span-2 sm:col-span-1">
          <EditLabel>Vacuna / Vaccine</EditLabel>
          <select
            className="w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
            style={inputStyle}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {VACCINE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value={OTHER}>Otra…</option>
          </select>
          {draft.name === OTHER && (
            <input
              type="text"
              placeholder="Nombre de la vacuna"
              className="mt-1.5 w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
              style={inputStyle}
              value={draft.nameOther}
              onChange={(e) => setDraft((d) => ({ ...d, nameOther: e.target.value }))}
            />
          )}
        </div>
        <div>
          <EditLabel>Fecha / Date</EditLabel>
          <input
            type="date"
            className="w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
            style={inputStyle}
            value={draft.appliedAt}
            onChange={(e) => setDraft((d) => ({ ...d, appliedAt: e.target.value }))}
          />
        </div>
        <div>
          <EditLabel>Peso / Weight</EditLabel>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="0.0"
              className="w-full h-9 rounded-[8px] pl-2 pr-8 text-[12.5px] font-bold outline-none"
              style={inputStyle}
              value={draft.weightKg}
              onChange={(e) => setDraft((d) => ({ ...d, weightKg: e.target.value }))}
            />
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold"
              style={{ color: BRAND.inkSoft }}
            >
              kg
            </span>
          </div>
        </div>
        <div>
          <EditLabel>Próxima / Booster</EditLabel>
          <input
            type="date"
            className="w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
            style={inputStyle}
            value={draft.nextAt}
            onChange={(e) => setDraft((d) => ({ ...d, nextAt: e.target.value }))}
          />
        </div>
        <div className="col-span-2 sm:col-span-4">
          <EditLabel>Observaciones (opcional)</EditLabel>
          <input
            type="text"
            placeholder="Lote, reacciones, notas…"
            className="w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
            style={inputStyle}
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          />
        </div>
      </div>
      <EditActions saving={saving} error={error} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

function EditDewormingRow({
  draft,
  setDraft,
  saving,
  error,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="rounded-[12px] px-3 py-3"
      style={{ border: `2px solid ${BRAND.orange}`, background: "#fff" }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="col-span-2 sm:col-span-1">
          <EditLabel>Producto / Product</EditLabel>
          <select
            className="w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
            style={inputStyle}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {DEWORM_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value={OTHER}>Otro…</option>
          </select>
          {draft.name === OTHER && (
            <input
              type="text"
              placeholder="Nombre del producto"
              className="mt-1.5 w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
              style={inputStyle}
              value={draft.nameOther}
              onChange={(e) => setDraft((d) => ({ ...d, nameOther: e.target.value }))}
            />
          )}
        </div>
        <div>
          <EditLabel>Tipo / Type</EditLabel>
          <select
            className="w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
            style={inputStyle}
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
          >
            <option value="">—</option>
            <option value="Interna">Interna</option>
            <option value="Externa">Externa</option>
            <option value="Ambas">Ambas</option>
          </select>
        </div>
        <div>
          <EditLabel>Fecha / Date</EditLabel>
          <input
            type="date"
            className="w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
            style={inputStyle}
            value={draft.appliedAt}
            onChange={(e) => setDraft((d) => ({ ...d, appliedAt: e.target.value }))}
          />
        </div>
        <div>
          <EditLabel>Próxima / Next</EditLabel>
          <input
            type="date"
            className="w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
            style={inputStyle}
            value={draft.nextAt}
            onChange={(e) => setDraft((d) => ({ ...d, nextAt: e.target.value }))}
          />
        </div>
        <div className="col-span-2 sm:col-span-4">
          <EditLabel>Dosis / Observaciones (opcional)</EditLabel>
          <input
            type="text"
            placeholder="1 tableta / 10 kg, notas…"
            className="w-full h-9 rounded-[8px] px-2 text-[12.5px] font-bold outline-none"
            style={inputStyle}
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          />
        </div>
      </div>
      <EditActions saving={saving} error={error} onSave={onSave} onCancel={onCancel} />
    </div>
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
