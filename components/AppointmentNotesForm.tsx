"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/input";

export function AppointmentNotesForm({
  id,
  defaultVetNotes,
  defaultInstructions,
  defaultMedications,
  defaultCompleted,
  action,
}: {
  id: string;
  defaultVetNotes: string;
  defaultInstructions: string;
  defaultMedications: string;
  defaultCompleted: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) =>
        start(async () => {
          try {
            await action(fd);
            toast.success(
              defaultCompleted ? "Cambios guardados" : "Cita confirmada",
              {
                description: defaultCompleted
                  ? "Las notas se actualizaron."
                  : "Las notas quedaron guardadas y la cita se marcó como completada.",
              }
            );
            router.refresh();
          } catch (e) {
            toast.error("No pudimos guardar", {
              description: e instanceof Error ? e.message : "Intenta de nuevo.",
            });
          }
        })
      }
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="id" value={id} />
      {/* Saving these notes always confirms the appointment as completed */}
      <input type="hidden" name="markCompleted" value="on" />
      <div>
        <Label htmlFor="vetNotes">Diagnóstico / observaciones</Label>
        <Textarea
          id="vetNotes"
          name="vetNotes"
          defaultValue={defaultVetNotes}
          placeholder="Qué encontraste, hallazgos, comportamiento..."
        />
      </div>
      <div>
        <Label htmlFor="instructions">Indicaciones para el cliente</Label>
        <Textarea
          id="instructions"
          name="instructions"
          defaultValue={defaultInstructions}
          placeholder="Dieta, reposo, curaciones, próxima visita..."
        />
      </div>
      <div>
        <Label htmlFor="medications">Medicamentos</Label>
        <Textarea
          id="medications"
          name="medications"
          defaultValue={defaultMedications}
          placeholder="1. Amoxicilina 250mg cada 8h por 7 días..."
        />
      </div>

      <Button size="xl" type="submit" disabled={pending}>
        {pending
          ? "Guardando..."
          : defaultCompleted
            ? "Guardar cambios"
            : "Confirmar"}
      </Button>
    </form>
  );
}
