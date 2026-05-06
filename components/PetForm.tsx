"use client";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SPECIES_EMOJI, SPECIES_LABEL, SEX_LABEL, dateToInputValue } from "@/lib/utils";
import { PetPhotoPicker } from "@/components/PetPhotoPicker";

const species = ["DOG", "CAT", "BIRD", "RABBIT", "HAMSTER", "REPTILE", "OTHER"] as const;

export type PetFormInitial = {
  id?: string;
  name?: string;
  species?: string;
  breed?: string | null;
  birthDate?: Date | string | null;
  sex?: string;
  weightKg?: number | null;
  color?: string | null;
  microchipId?: string | null;
  sterilized?: boolean;
  notes?: string | null;
  photoUrl?: string | null;
};

export function PetForm({
  action,
  initial,
  submitLabel = "Guardar",
  resetOnSuccess = false,
  redirectTo,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: PetFormInitial;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const init = initial ?? {};

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          try {
            await action(fd);
            toast.success(init.id ? "Mascota actualizada" : "Mascota agregada", {
              description: init.id ? "Tus cambios se guardaron." : "Ya puedes agendar su próxima visita.",
            });
            if (resetOnSuccess) formRef.current?.reset();
            if (redirectTo) router.push(redirectTo);
            else router.refresh();
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Algo salió mal";
            toast.error("No pudimos guardar", { description: msg });
          }
        })
      }
      className="flex flex-col gap-4"
    >
      {init.id && <input type="hidden" name="id" value={init.id} />}

      <PetPhotoPicker
        name="photoUrl"
        defaultPhotoUrl={init.photoUrl ?? null}
        petId={init.id}
        species={init.species ?? "DOG"}
        petName={init.name}
      />

      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required defaultValue={init.name ?? ""} placeholder="Ej. Michi" />
      </div>

      <div>
        <Label>Especie</Label>
        <div className="grid grid-cols-4 gap-2">
          {species.map((s, idx) => (
            <label
              key={s}
              className="flex flex-col items-center justify-center gap-1 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5 cursor-pointer has-[:checked]:bg-[var(--color-brand-soft)] has-[:checked]:border-[var(--color-brand)] has-[:checked]:text-[var(--color-brand)] transition"
            >
              <input
                type="radio"
                name="species"
                value={s}
                defaultChecked={init.species ? init.species === s : idx === 0}
                className="sr-only"
              />
              <span className="text-xl" aria-hidden>{SPECIES_EMOJI[s]}</span>
              <span className="text-[11px] font-medium">{SPECIES_LABEL[s]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="breed">Raza</Label>
          <Input id="breed" name="breed" defaultValue={init.breed ?? ""} placeholder="Mestizo, Persa..." />
        </div>
        <div>
          <Label htmlFor="color">Color / pelaje</Label>
          <Input id="color" name="color" defaultValue={init.color ?? ""} placeholder="Negro, atigrado..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="birthDate">Fecha de nacimiento</Label>
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={dateToInputValue(init.birthDate ?? null)}
          />
        </div>
        <div>
          <Label htmlFor="weightKg">Peso (kg)</Label>
          <Input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            min="0"
            defaultValue={init.weightKg ?? ""}
            placeholder="Ej. 8.5"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="sex">Sexo</Label>
        <Select id="sex" name="sex" defaultValue={init.sex ?? "UNKNOWN"}>
          {(["MALE", "FEMALE", "UNKNOWN"] as const).map((v) => (
            <option key={v} value={v}>{SEX_LABEL[v]}</option>
          ))}
        </Select>
      </div>

      <label className="flex items-center gap-3 p-3 rounded-[14px] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
        <input
          type="checkbox"
          name="sterilized"
          defaultChecked={init.sterilized ?? false}
          className="h-5 w-5"
        />
        <span className="text-[15px]">Esterilizado / castrado</span>
      </label>

      <div>
        <Label htmlFor="notes">Notas (alergias, manías, etc.)</Label>
        <Textarea id="notes" name="notes" defaultValue={init.notes ?? ""} placeholder="Ej. alérgico a la penicilina, asustadizo con ruidos." />
      </div>

      <Button type="submit" size="xl" disabled={pending}>
        {pending ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
