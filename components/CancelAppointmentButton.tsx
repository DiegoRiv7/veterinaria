"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, X, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelAppointmentAction } from "@/app/actions/appointments";

export function CancelAppointmentButton({
  id,
  redirectTo,
}: {
  id: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function onConfirm() {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        await cancelAppointmentAction(fd);
        toast.success("Cita cancelada", {
          description: "Te avisamos al veterinario.",
        });
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } catch (e) {
        toast.error("No se pudo cancelar", {
          description: e instanceof Error ? e.message : "Intenta de nuevo.",
        });
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button
        size="xl"
        variant="dangerSoft"
        className="w-full"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Ban className="h-4 w-4" />
        Cancelar cita
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[var(--color-surface)] rounded-[20px] shadow-[var(--shadow-soft-lg)] border border-[var(--color-border)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-6 pb-2 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-[var(--color-warning-soft)] flex items-center justify-center mb-3">
                <AlertTriangle className="h-6 w-6 text-[var(--color-warning)]" />
              </div>
              <h3 className="text-[18px] font-semibold tracking-tight">¿Cancelar esta cita?</h3>
              <p className="text-[14px] text-[var(--color-muted)] mt-1.5 max-w-[28ch]">
                Si necesitas otra fecha, puedes reagendarla en cualquier momento.
              </p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-2">
              <Button
                size="lg"
                variant="dangerSoft"
                className="w-full"
                onClick={onConfirm}
                disabled={pending}
              >
                {pending ? "Cancelando..." : "Sí, cancelar"}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="w-full"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                <X className="h-4 w-4" />
                No, dejar la cita
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
