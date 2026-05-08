"use client";
import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, X, Loader2 } from "lucide-react";
import { PetHero, type PetHeroData } from "@/components/client/PetHero";
import { updatePetCustomizationAction } from "@/app/actions/cartilla";
import {
  paletteByIndex,
  paletteFor,
  paletteForStyle,
  isTransparentStyle,
  PALETTE_COUNT,
  bgEmojisFor,
  type PetPalette,
} from "@/lib/pet-flavor";

type Props = {
  petId: string;
  petName: string;
  petSpecies: string;
  petPhotoUrl: string | null;
  galleryUrls: string[];
  defaultMood: string;
  defaultPersonality: string[];
  initial: {
    cardStyle: string | null;
    personalityTags: string[] | null;
    customMood: string | null;
  };
};

const SUGGESTED_TAGS_BY_SPECIES: Record<string, string[]> = {
  DOG: [
    "Juguetón",
    "Leal",
    "Aventurero",
    "Tierno",
    "Gruñón",
    "Glotón",
    "Atleta",
    "Madrugador",
  ],
  CAT: [
    "Curioso",
    "Independiente",
    "Cariñoso",
    "Ronroneador",
    "Dormilón",
    "Cazador",
    "Tímido",
    "Travieso",
  ],
  RABBIT: [
    "Tierno",
    "Mañanero",
    "Saltarín",
    "Curioso",
    "Comelón",
    "Ninja",
  ],
  BIRD: ["Cantor", "Sociable", "Despierto", "Imitador", "Tímido"],
  HAMSTER: ["Inquieto", "Nocturno", "Pequeño explorador", "Glotón"],
  REPTILE: ["Tranquilo", "Misterioso", "Observador", "Solitario"],
  OTHER: ["Único", "Especial", "Querido", "Mágico"],
};

const MOOD_SUGGESTIONS = [
  "Está feliz y relajada 😌",
  "Listo para una aventura 🐾",
  "Hambriento como siempre 🍖",
  "Persiguiendo sombras 🐈",
  "Durmiendo al sol ☀️",
  "Esperando su paseo 🦮",
];

export function PetdexEditorClient({
  petId,
  petName,
  petSpecies,
  petPhotoUrl,
  galleryUrls,
  defaultMood,
  defaultPersonality,
  initial,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cardStyle, setCardStyle] = useState<string | null>(
    initial.cardStyle
  );
  const [tags, setTags] = useState<string[]>(
    initial.personalityTags ?? defaultPersonality
  );
  const [mood, setMood] = useState<string>(initial.customMood ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Schedule a debounced save when state changes after mount.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      startTransition(async () => {
        const result = await updatePetCustomizationAction(petId, {
          cardStyle: cardStyle === null ? "auto" : cardStyle,
          personalityTags: tags,
          customMood: mood,
        });
        setSaving(false);
        if (result.ok) {
          setSavedAt(Date.now());
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
    }, 450);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [cardStyle, tags, mood, petId, router]);

  // Live preview palette
  const previewPalette = paletteForStyle({ id: petId, cardStyle });
  const previewTransparent = isTransparentStyle(cardStyle);
  const previewMood = mood.trim() || defaultMood;

  const previewPet: PetHeroData = {
    id: petId,
    name: petName,
    species: petSpecies,
    photoUrl: petPhotoUrl,
    galleryUrls,
    bgEmojis: bgEmojisFor(petSpecies),
    mood: previewMood,
    personality: tags.length > 0 ? tags : defaultPersonality,
    status: "Vista previa",
    statusOk: true,
    palette: previewPalette,
    transparent: previewTransparent,
  };

  const suggested = SUGGESTED_TAGS_BY_SPECIES[petSpecies] ?? SUGGESTED_TAGS_BY_SPECIES.OTHER;
  const remainingSuggested = suggested.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  );

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t) return;
    if (tags.length >= 3) {
      toast.error("Máximo 3 características.");
      return;
    }
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    setTags([...tags, t]);
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function resetTags() {
    setTags(defaultPersonality);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Live preview ───────────────────────────────────── */}
      <div className="relative">
        <PetHero pet={previewPet} cardHref="#" />
        <SaveIndicator saving={saving} savedAt={savedAt} />
      </div>

      {/* ── Color ──────────────────────────────────────────── */}
      <Section title="Color del fondo">
        <ColorPicker
          petId={petId}
          selected={cardStyle}
          onChange={setCardStyle}
        />
      </Section>

      {/* ── Personalidad (tags) ────────────────────────────── */}
      <Section
        title="Personalidad"
        subtitle={`Hasta 3 características de ${petName} (${tags.length}/3)`}
        right={
          tags.join("|") !== defaultPersonality.join("|") ? (
            <button
              type="button"
              onClick={resetTags}
              className="text-[12px] font-bold"
              style={{ color: "var(--color-brand)" }}
            >
              Reset
            </button>
          ) : null
        }
      >
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.length === 0 ? (
            <p
              className="text-[12px] font-semibold italic"
              style={{ color: "var(--color-muted)" }}
            >
              Sin características — el cuadro se verá más limpio.
            </p>
          ) : (
            tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-[12px] font-extrabold"
                style={{
                  background:
                    "color-mix(in oklab, var(--color-brand) 14%, var(--color-surface-2, var(--color-surface)))",
                  border:
                    "1px solid color-mix(in oklab, var(--color-brand) 32%, var(--color-border))",
                  color: "var(--color-brand)",
                }}
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  aria-label={`Quitar ${t}`}
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: "color-mix(in oklab, var(--color-brand) 22%, transparent)",
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>

        <CustomTagInput
          disabled={tags.length >= 3}
          onAdd={addTag}
          accent="var(--color-brand)"
        />

        {remainingSuggested.length > 0 && tags.length < 3 && (
          <div className="mt-3">
            <p
              className="text-[10px] font-extrabold uppercase tracking-wide mb-1.5"
              style={{ color: "var(--color-muted)" }}
            >
              Sugerencias
            </p>
            <div className="flex flex-wrap gap-1.5">
              {remainingSuggested.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition"
                  style={{
                    background: "var(--color-surface-2, var(--color-surface))",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-foreground)",
                  }}
                >
                  <Plus className="h-3 w-3" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── Mood / frase ───────────────────────────────────── */}
      <Section
        title="Frase debajo del nombre"
        subtitle={`La que aparece en italic — déjala vacía para usar la sugerida`}
      >
        <input
          type="text"
          value={mood}
          onChange={(e) => setMood(e.target.value.slice(0, 80))}
          placeholder={defaultMood}
          maxLength={80}
          className="w-full h-12 px-4 rounded-[12px] border text-[14px] font-semibold outline-none transition"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-foreground)",
          }}
        />
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {MOOD_SUGGESTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold transition"
              style={{
                background: "var(--color-surface-2, var(--color-surface))",
                border: "1px solid var(--color-border)",
                color: "var(--color-muted)",
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <p
          className="text-[11px] font-semibold mt-2"
          style={{ color: "var(--color-muted)" }}
        >
          {mood.length}/80 caracteres
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-[20px] p-4 lg:p-5"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p
            className="text-[14px] font-black"
            style={{ color: "var(--color-foreground)" }}
          >
            {title}
          </p>
          {subtitle && (
            <p
              className="text-[12px] font-semibold mt-0.5"
              style={{ color: "var(--color-muted)" }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function SaveIndicator({
  saving,
  savedAt,
}: {
  saving: boolean;
  savedAt: number | null;
}) {
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (savedAt) {
      setShowSaved(true);
      const id = setTimeout(() => setShowSaved(false), 1600);
      return () => clearTimeout(id);
    }
  }, [savedAt]);

  if (!saving && !showSaved) return null;
  return (
    <div
      className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold"
      style={{
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
        color: "white",
      }}
    >
      {saving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando…
        </>
      ) : (
        <>
          <Check className="h-3 w-3" />
          Guardado
        </>
      )}
    </div>
  );
}

function ColorPicker({
  petId,
  selected,
  onChange,
}: {
  petId: string;
  selected: string | null;
  onChange: (v: string | null) => void;
}) {
  const autoPalette = paletteFor({ id: petId });
  const swatches: { id: string | null; palette: PetPalette; label: string }[] =
    [
      { id: null, palette: autoPalette, label: "Automático" },
      ...Array.from({ length: PALETTE_COUNT }, (_, i) => ({
        id: String(i),
        palette: paletteByIndex(i),
        label: `Tono ${i + 1}`,
      })),
    ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2.5">
        {swatches.map((s) => {
          const active =
            (selected === null && s.id === null) || selected === s.id;
          return (
            <button
              key={String(s.id)}
              type="button"
              onClick={() => onChange(s.id)}
              aria-label={s.label}
              aria-pressed={active}
              className="relative rounded-full transition"
              style={{
                width: 42,
                height: 42,
                background: `linear-gradient(135deg, ${s.palette.from}, ${s.palette.to})`,
                border: active
                  ? `3px solid ${s.palette.accent}`
                  : "2px solid color-mix(in oklab, var(--color-border) 60%, transparent)",
                boxShadow: active ? `0 4px 14px ${s.palette.accent}66` : "none",
              }}
            >
              {active && (
                <span
                  className="absolute inset-0 flex items-center justify-center text-white"
                  aria-hidden
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange("transparent")}
        aria-pressed={selected === "transparent"}
        className="flex items-center gap-3 px-4 py-3 rounded-[14px] transition text-left"
        style={{
          background:
            selected === "transparent"
              ? "color-mix(in oklab, var(--color-brand) 10%, transparent)"
              : "var(--color-surface-2, var(--color-surface))",
          border: `1.5px solid ${
            selected === "transparent"
              ? "var(--color-brand)"
              : "var(--color-border)"
          }`,
        }}
      >
        <div
          className="rounded-[12px] flex items-center justify-center shrink-0"
          style={{
            width: 38,
            height: 38,
            background: `
              linear-gradient(45deg, var(--color-border) 25%, transparent 25%) 0 0/10px 10px,
              linear-gradient(-45deg, var(--color-border) 25%, transparent 25%) 0 5px/10px 10px,
              linear-gradient(45deg, transparent 75%, var(--color-border) 75%) 5px -5px/10px 10px,
              linear-gradient(-45deg, transparent 75%, var(--color-border) 75%) -5px 0/10px 10px,
              var(--color-surface)`,
          }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-extrabold"
            style={{ color: "var(--color-foreground)" }}
          >
            Transparente
          </p>
          <p
            className="text-[11px] font-semibold"
            style={{ color: "var(--color-muted)" }}
          >
            Que las fotos sean las protagonistas
          </p>
        </div>
        {selected === "transparent" && (
          <Check
            className="h-5 w-5"
            strokeWidth={3}
            style={{ color: "var(--color-brand)" }}
          />
        )}
      </button>
    </div>
  );
}

function CustomTagInput({
  disabled,
  onAdd,
  accent,
}: {
  disabled: boolean;
  onAdd: (tag: string) => void;
  accent: string;
}) {
  const [val, setVal] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!val.trim()) return;
        onAdd(val);
        setVal("");
      }}
      className="flex gap-2"
    >
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value.slice(0, 24))}
        placeholder={disabled ? "Máximo 3" : "Agregar característica"}
        disabled={disabled}
        maxLength={24}
        className="flex-1 h-10 px-3.5 rounded-[12px] border text-[13px] font-semibold outline-none disabled:opacity-60"
        style={{
          background: "var(--color-surface-2, var(--color-surface))",
          borderColor: "var(--color-border)",
          color: "var(--color-foreground)",
        }}
      />
      <button
        type="submit"
        disabled={disabled || !val.trim()}
        className="px-4 rounded-[12px] text-white text-[13px] font-extrabold transition disabled:opacity-40"
        style={{
          background: accent,
          height: 40,
        }}
      >
        +
      </button>
    </form>
  );
}
