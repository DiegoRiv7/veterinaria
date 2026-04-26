"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { ChevronLeft, Check } from "lucide-react";
import {
  SPECIES_EMOJI,
  SPECIES_LABEL,
  formatCurrency,
  formatDate,
  formatTime,
  cn,
} from "@/lib/utils";
import { createAppointmentAction } from "@/app/actions/appointments";
import { SuccessCelebration } from "@/components/SuccessCelebration";
import { PetAvatar } from "@/components/PetAvatar";
import { VetAvatar } from "@/components/VetAvatar";

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photoUrl?: string | null;
};
type Service = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  durationMinutes: number;
};

type VetAvailability = {
  vetId: string;
  vetName: string;
  bio: string | null;
  photoUrl: string | null;
  slots: { start: string; end: string }[];
};

function next14Days() {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    days.push(new Date(d.getTime() + i * 24 * 60 * 60 * 1000));
  }
  return days;
}

export type BookingPrefill = {
  fromAppointmentId: string;
  petId: string;
  serviceId: string;
  clientNotes: string;
};

export function BookingWizard({
  pets,
  services,
  speciesMultipliers,
  prefill,
}: {
  pets: Pet[];
  services: Service[];
  speciesMultipliers: Record<string, number>;
  prefill?: BookingPrefill | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(prefill ? 3 : 1);
  const [petId, setPetId] = useState<string | null>(prefill?.petId ?? null);
  const [serviceId, setServiceId] = useState<string | null>(prefill?.serviceId ?? null);
  const [date, setDate] = useState<Date | null>(null);
  const [vetId, setVetId] = useState<string | null>(null);
  const [slotISO, setSlotISO] = useState<string | null>(null);
  const [notes, setNotes] = useState(prefill?.clientNotes ?? "");
  const [availability, setAvailability] = useState<VetAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, startTransition] = useTransition();
  const [success, setSuccess] = useState<{ id: string; scheduledAt: string } | null>(null);

  const pet = useMemo(() => pets.find((p) => p.id === petId) ?? null, [pets, petId]);
  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const priceEstimate = useMemo(() => {
    if (!pet || !service) return 0;
    return Math.round(service.basePrice * (speciesMultipliers[pet.species] ?? 1));
  }, [pet, service, speciesMultipliers]);

  async function loadAvailability(d: Date) {
    if (!service) return;
    setLoadingAvailability(true);
    try {
      const params = new URLSearchParams({
        date: d.toISOString(),
        duration: String(service.durationMinutes),
      });
      const res = await fetch(`/api/availability?${params.toString()}`);
      const json = (await res.json()) as VetAvailability[];
      setAvailability(json);
    } finally {
      setLoadingAvailability(false);
    }
  }

  function onPickDate(d: Date) {
    setDate(d);
    setVetId(null);
    setSlotISO(null);
    void loadAvailability(d);
    setStep(4);
  }

  function onConfirm() {
    if (!petId || !serviceId || !vetId || !slotISO) return;
    const fd = new FormData();
    fd.set("petId", petId);
    fd.set("serviceId", serviceId);
    fd.set("vetId", vetId);
    fd.set("scheduledAt", slotISO);
    fd.set("clientNotes", notes);
    if (prefill?.fromAppointmentId) {
      fd.set("fromAppointmentId", prefill.fromAppointmentId);
    }
    startTransition(async () => {
      try {
        const result = await createAppointmentAction(fd);
        setSuccess(result);
      } catch (e) {
        console.error(e);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <Steps current={step} />

      {step === 1 && (
        <section className="mt-2">
          <h2 className="text-[17px] font-semibold mb-3">¿Para cuál mascota?</h2>
          {pets.length === 0 ? (
            <Card>
              <CardBody className="text-center py-8">
                <p className="text-[15px] text-[var(--color-muted)] mb-3">
                  Aún no has agregado mascotas.
                </p>
                <Link href="/mascotas/nueva">
                  <Button>Agregar mascota</Button>
                </Link>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-3">
              {pets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPetId(p.id);
                    setStep(2);
                  }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-[16px] bg-[var(--color-surface)] border-2 transition text-left",
                    petId === p.id ? "border-[var(--color-brand)]" : "border-[var(--color-border)] hover:border-[var(--color-muted-2)]"
                  )}
                >
                  <PetAvatar
                    size="md"
                    photoUrl={p.photoUrl}
                    species={p.species}
                    name={p.name}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-[16px]">{p.name}</p>
                    <p className="text-[13px] text-[var(--color-muted)]">
                      {SPECIES_LABEL[p.species]}
                      {p.breed ? ` · ${p.breed}` : ""}
                    </p>
                  </div>
                </button>
              ))}
              <Link href="/mascotas/nueva" className="text-center text-sm text-[var(--color-brand)] py-3">
                + Agregar otra mascota
              </Link>
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="mt-2">
          <BackButton onClick={() => setStep(1)} />
          <h2 className="text-[17px] font-semibold mb-3">¿Qué tipo de servicio?</h2>
          <div className="grid gap-3">
            {services.map((s) => {
              const price = pet ? Math.round(s.basePrice * (speciesMultipliers[pet.species] ?? 1)) : s.basePrice;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setServiceId(s.id);
                    setStep(3);
                  }}
                  className={cn(
                    "p-4 rounded-[16px] bg-[var(--color-surface)] border-2 transition text-left",
                    serviceId === s.id ? "border-[var(--color-brand)]" : "border-[var(--color-border)] hover:border-[var(--color-muted-2)]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[16px]">{s.name}</p>
                    <p className="font-semibold text-[var(--color-brand)]">{formatCurrency(price)}</p>
                  </div>
                  {s.description && (
                    <p className="text-[13px] text-[var(--color-muted)] mt-1">{s.description}</p>
                  )}
                  <p className="text-[12px] text-[var(--color-muted)] mt-2">
                    Duración aprox. {s.durationMinutes} min
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="mt-2">
          <BackButton onClick={() => setStep(2)} />
          <h2 className="text-[17px] font-semibold mb-3">Elige el día</h2>
          <div className="grid grid-cols-4 gap-2">
            {next14Days().map((d) => {
              const isSunday = d.getDay() === 0;
              const selected = date?.toDateString() === d.toDateString();
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => onPickDate(d)}
                  disabled={isSunday}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-[12px] border-2 transition",
                    selected
                      ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted-2)]",
                    isSunday && "opacity-40"
                  )}
                >
                  <span className="text-[11px] text-[var(--color-muted)] uppercase">
                    {d.toLocaleDateString("es-MX", { weekday: "short" })}
                  </span>
                  <span className="text-[20px] font-semibold mt-0.5">{d.getDate()}</span>
                  <span className="text-[11px] text-[var(--color-muted)]">
                    {d.toLocaleDateString("es-MX", { month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--color-muted)] mt-3 text-center">
            Domingos cerrado.
          </p>
        </section>
      )}

      {step === 4 && (
        <section className="mt-2">
          <BackButton onClick={() => setStep(3)} />
          <h2 className="text-[17px] font-semibold mb-3">Veterinario y hora</h2>
          {loadingAvailability ? (
            <Card><CardBody className="py-8 text-center text-[var(--color-muted)]">Buscando horarios...</CardBody></Card>
          ) : availability.every((v) => v.slots.length === 0) ? (
            <Card>
              <CardBody className="py-8 text-center">
                <p className="text-[15px] text-[var(--color-muted)] mb-3">No hay horarios disponibles ese día.</p>
                <Button variant="secondary" onClick={() => setStep(3)}>Elegir otro día</Button>
              </CardBody>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {availability.map((v) => (
                <Card key={v.vetId}>
                  <CardBody>
                    <div className="flex items-center gap-3 mb-3">
                      <VetAvatar size="md" photoUrl={v.photoUrl} name={v.vetName} />
                      <div>
                        <p className="font-medium">{v.vetName}</p>
                        {v.bio && <p className="text-[12px] text-[var(--color-muted)] line-clamp-1">{v.bio}</p>}
                      </div>
                    </div>
                    {v.slots.length === 0 ? (
                      <p className="text-[13px] text-[var(--color-muted)]">Sin horarios libres este día.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {v.slots.slice(0, 18).map((s) => {
                          const active = vetId === v.vetId && slotISO === s.start;
                          return (
                            <button
                              key={s.start}
                              onClick={() => {
                                setVetId(v.vetId);
                                setSlotISO(s.start);
                                setStep(5);
                              }}
                              className={cn(
                                "h-10 rounded-[10px] text-sm font-medium transition",
                                active
                                  ? "bg-[var(--color-brand)] text-white"
                                  : "bg-[var(--color-surface-2)] hover:bg-[var(--color-brand-soft)] text-[var(--color-foreground)]"
                              )}
                            >
                              {formatTime(s.start)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 5 && pet && service && slotISO && vetId && (
        <section className="mt-2">
          <BackButton onClick={() => setStep(4)} />
          <h2 className="text-[17px] font-semibold mb-3">Confirma tu cita</h2>
          <Card>
            <CardBody className="flex flex-col gap-3">
              <Row label="Mascota" value={`${pet.name} · ${SPECIES_LABEL[pet.species]}`} />
              <Row label="Servicio" value={service.name} />
              <Row label="Veterinario" value={availability.find((v) => v.vetId === vetId)?.vetName ?? ""} />
              <Row label="Fecha" value={formatDate(slotISO)} />
              <Row label="Hora" value={formatTime(slotISO)} />
              <hr className="border-[var(--color-border)]" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] uppercase tracking-wide text-[var(--color-muted)]">Estimado</span>
                <span className="text-[22px] font-semibold text-[var(--color-brand)]">
                  {formatCurrency(priceEstimate)}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)]">
                Pago en consultorio. El costo puede variar según el diagnóstico.
              </p>
            </CardBody>
          </Card>

          <div className="mt-4">
            <label className="text-[13px] font-medium text-[var(--color-muted)] uppercase tracking-wide mb-1.5 block">
              ¿Algo que el veterinario deba saber? (opcional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. ha estado decaída desde el lunes."
            />
          </div>

          <Button size="xl" className="mt-6" onClick={onConfirm} disabled={submitting}>
            <Check className="h-5 w-5" />
            {submitting ? "Agendando..." : "Confirmar cita"}
          </Button>
        </section>
      )}

      {success && (
        <SuccessCelebration
          scheduledAt={success.scheduledAt}
          appointmentId={success.id}
        />
      )}
    </div>
  );
}

function Steps({ current }: { current: number }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={cn(
            "h-1.5 flex-1 rounded-full transition",
            n <= current ? "bg-[var(--color-brand)]" : "bg-[var(--color-border)]"
          )}
        />
      ))}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[15px] text-[var(--color-brand)] mb-3"
    >
      <ChevronLeft className="h-5 w-5" /> Atrás
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] uppercase tracking-wide text-[var(--color-muted)]">{label}</span>
      <span className="text-[15px] font-medium text-right">{value}</span>
    </div>
  );
}
