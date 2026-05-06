"use client";
import { useActionState, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { signupAction } from "@/app/actions/auth";
import { VetIcon } from "@/components/vet/VetIcon";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { SPECIES_EMOJI, SPECIES_LABEL } from "@/lib/utils";

const species = ["DOG", "CAT", "BIRD", "RABBIT", "HAMSTER", "REPTILE", "OTHER"] as const;
type Species = (typeof species)[number];

const fieldClass =
  "w-full h-12 px-4 rounded-[12px] border outline-none text-[15px] font-semibold focus:border-[var(--vet-green)] transition-colors";
const fieldStyle = {
  background: "var(--vet-bg-card)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
} as const;
const labelClass =
  "block text-[12px] font-extrabold uppercase tracking-wider mb-1.5";
const labelStyle = { color: "var(--vet-text-3)" } as const;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("read failed"));
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, { error: undefined });
  const [chosen, setChosen] = useState<Species>("DOG");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingDataUrl, setEditingDataUrl] = useState<string | null>(null);
  const [petPhotoUrl, setPetPhotoUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  function openPicker() {
    fileInputRef.current?.click();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setEditingDataUrl(result);
    };
    reader.readAsDataURL(file);
  }

  async function handleCropDone(blob: Blob) {
    setEditingDataUrl(null);
    setProcessing(true);
    try {
      const dataUrl = await blobToDataUrl(blob);
      setPetPhotoUrl(dataUrl);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className={labelClass} style={labelStyle}>
          Tu nombre
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          placeholder="Ej. Rosa Martínez"
          className={fieldClass}
          style={fieldStyle}
        />
      </div>
      <div>
        <label htmlFor="email" className={labelClass} style={labelStyle}>
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
          className={fieldClass}
          style={fieldStyle}
        />
      </div>
      <div>
        <label htmlFor="phone" className={labelClass} style={labelStyle}>
          Teléfono (para contacto)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required
          placeholder="10 dígitos"
          className={fieldClass}
          style={fieldStyle}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass} style={labelStyle}>
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          className={fieldClass}
          style={fieldStyle}
        />
      </div>

      <div
        className="mt-2 rounded-[16px] border p-4"
        style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
      >
        <p className="text-[14px] font-extrabold" style={{ color: "var(--vet-text-1)" }}>
          Cuéntanos de tu mascota
        </p>
        <p className="text-[12px] font-semibold mt-0.5" style={{ color: "var(--vet-text-3)" }}>
          Puedes agregar más después.
        </p>

        {/* Optional pet photo */}
        <div className="flex items-center gap-3 mt-3">
          <button
            type="button"
            onClick={openPicker}
            disabled={processing}
            className="relative rounded-full flex items-center justify-center shrink-0 overflow-hidden"
            style={{
              width: 64,
              height: 64,
              background: petPhotoUrl
                ? "transparent"
                : "var(--vet-bg-card)",
              border: "2px dashed var(--vet-border)",
              color: "var(--vet-text-3)",
            }}
            aria-label={petPhotoUrl ? "Cambiar foto de la mascota" : "Agregar foto de la mascota"}
          >
            {petPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={petPhotoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : processing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-extrabold"
              style={{ color: "var(--vet-text-1)" }}
            >
              {petPhotoUrl ? "Foto agregada" : "Foto de tu mascota (opcional)"}
            </p>
            <p
              className="text-[11px] font-semibold leading-snug"
              style={{ color: "var(--vet-text-3)" }}
            >
              Puedes subirla ahora o más tarde desde el perfil.
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileSelect}
        />
        <input
          type="hidden"
          name="petPhotoUrl"
          value={petPhotoUrl ?? ""}
        />

        <div className="mt-4">
          <label htmlFor="petName" className={labelClass} style={labelStyle}>
            Nombre de tu mascota
          </label>
          <input
            id="petName"
            name="petName"
            placeholder="Ej. Firulais"
            className={fieldClass}
            style={fieldStyle}
          />
        </div>
        <div className="mt-3">
          <p className={labelClass} style={labelStyle}>
            ¿Qué tipo de mascota es?
          </p>
          <input type="hidden" name="petSpecies" value={chosen} />
          <div className="grid grid-cols-4 gap-2">
            {species.map((s) => {
              const isActive = chosen === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setChosen(s)}
                  className="flex flex-col items-center justify-center gap-1 rounded-[12px] border p-2 transition-colors"
                  style={{
                    background: isActive
                      ? "var(--vet-green-glow)"
                      : "var(--vet-bg-card)",
                    borderColor: isActive
                      ? "var(--vet-green)"
                      : "var(--vet-border)",
                    color: isActive
                      ? "var(--vet-green)"
                      : "var(--vet-text-2)",
                    fontWeight: isActive ? 800 : 600,
                  }}
                  aria-pressed={isActive}
                >
                  <span className="text-xl" aria-hidden>
                    {SPECIES_EMOJI[s]}
                  </span>
                  <span className="text-[11px] font-bold">
                    {SPECIES_LABEL[s]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {state.error && (
        <p
          className="text-[13px] font-bold flex items-center gap-2 px-3 py-2 rounded-[10px]"
          style={{
            background: "oklch(60% 0.20 20 / 0.10)",
            color: "var(--vet-red)",
          }}
        >
          <VetIcon name="warning" size={14} color="var(--vet-red)" /> {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full mt-2 rounded-[14px] text-[15px] font-extrabold text-white transition-all disabled:opacity-60 hover:brightness-105 active:scale-[.99]"
        style={{
          background:
            "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
          boxShadow: "0 8px 24px var(--vet-green-glow)",
        }}
      >
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      {editingDataUrl && (
        <PhotoCropDialog
          imageSrc={editingDataUrl}
          onCancel={() => setEditingDataUrl(null)}
          onConfirm={handleCropDone}
        />
      )}
    </form>
  );
}
