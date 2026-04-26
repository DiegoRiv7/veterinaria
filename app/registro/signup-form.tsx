"use client";
import { useActionState } from "react";
import { signupAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SPECIES_EMOJI, SPECIES_LABEL } from "@/lib/utils";

const species = ["DOG", "CAT", "BIRD", "RABBIT", "HAMSTER", "REPTILE", "OTHER"] as const;

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, { error: undefined });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">Tu nombre</Label>
        <Input id="name" name="name" required autoComplete="name" placeholder="Ej. Rosa Martínez" />
      </div>
      <div>
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" required placeholder="10 dígitos" />
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" />
      </div>

      <div className="mt-2 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
        <p className="text-[15px] font-medium">Cuéntanos de tu mascota</p>
        <p className="text-[13px] text-[var(--color-muted)] mt-1">
          Puedes agregar más después.
        </p>
        <div className="mt-3">
          <Label htmlFor="petName">Nombre de tu mascota</Label>
          <Input id="petName" name="petName" placeholder="Ej. Firulais" />
        </div>
        <div className="mt-3">
          <Label>¿Qué tipo de mascota es?</Label>
          <div className="grid grid-cols-4 gap-2">
            {species.map((s, idx) => (
              <label
                key={s}
                className="flex flex-col items-center justify-center gap-1 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2 cursor-pointer hover:border-[var(--color-brand)] has-[:checked]:bg-[var(--color-brand-soft)] has-[:checked]:border-[var(--color-brand)] has-[:checked]:text-[var(--color-brand)] transition"
              >
                <input
                  type="radio"
                  name="petSpecies"
                  value={s}
                  defaultChecked={idx === 0}
                  className="sr-only"
                />
                <span className="text-xl" aria-hidden>{SPECIES_EMOJI[s]}</span>
                <span className="text-[11px] font-medium">{SPECIES_LABEL[s]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      )}
      <Button size="xl" type="submit" disabled={pending}>
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
