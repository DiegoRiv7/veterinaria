"use client";
import { useActionState } from "react";
import { signupAction } from "@/app/actions/auth";
import { VetIcon } from "@/components/vet/VetIcon";
import { SPECIES_EMOJI, SPECIES_LABEL } from "@/lib/utils";

const species = ["DOG", "CAT", "BIRD", "RABBIT", "HAMSTER", "REPTILE", "OTHER"] as const;

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

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, { error: undefined });
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
        <div className="mt-3">
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
          <div className="grid grid-cols-4 gap-2">
            {species.map((s, idx) => (
              <label
                key={s}
                className="flex flex-col items-center justify-center gap-1 rounded-[12px] border p-2 cursor-pointer transition-colors has-[:checked]:[background:var(--vet-green-glow)] has-[:checked]:border-[var(--vet-green)] has-[:checked]:text-[var(--vet-green)]"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-2)",
                }}
              >
                <input
                  type="radio"
                  name="petSpecies"
                  value={s}
                  defaultChecked={idx === 0}
                  className="sr-only"
                />
                <span className="text-xl" aria-hidden>
                  {SPECIES_EMOJI[s]}
                </span>
                <span className="text-[11px] font-bold">{SPECIES_LABEL[s]}</span>
              </label>
            ))}
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
    </form>
  );
}
