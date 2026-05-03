"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VetIcon } from "./VetIcon";
import { createAppointmentByVetAction } from "@/app/actions/appointments";

export type ClientOption = {
  id: string;
  name: string;
  phone: string;
  pets: { id: string; name: string; species: string }[];
};

export type ServiceOption = {
  id: string;
  name: string;
  basePrice: number;
  durationMinutes: number;
};

const SPECIES: { value: string; label: string }[] = [
  { value: "DOG", label: "Perro" },
  { value: "CAT", label: "Gato" },
  { value: "BIRD", label: "Ave" },
  { value: "RABBIT", label: "Conejo" },
  { value: "HAMSTER", label: "Hámster" },
  { value: "REPTILE", label: "Reptil" },
  { value: "OTHER", label: "Otro" },
];

type Mode = "existing" | "new";

type Props = {
  clients: ClientOption[];
  services: ServiceOption[];
  /** Optional default date in YYYY-MM-DD (used when launched from a calendar day) */
  defaultDate?: string;
  /** Visual style — primary green by default; "ghost" pill for inline use */
  variant?: "primary" | "secondary";
  label?: string;
};

export function NewAppointmentButton({
  clients,
  services,
  defaultDate,
  variant = "primary",
  label = "Nueva cita",
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-[12px] text-[13px] font-extrabold transition-all hover:brightness-105 active:scale-[.98]"
        style={
          variant === "primary"
            ? {
                background:
                  "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
                color: "white",
                boxShadow: "0 8px 24px var(--vet-green-glow)",
              }
            : {
                background: "var(--vet-bg-card)",
                color: "var(--vet-text-1)",
                border: "1px solid var(--vet-border)",
              }
        }
      >
        <VetIcon name="plus" size={14} color={variant === "primary" ? "white" : "var(--vet-text-1)"} />
        {label}
      </button>

      {open && (
        <NewAppointmentModal
          clients={clients}
          services={services}
          defaultDate={defaultDate}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ─── Modal ───────────────────────────────────────────── */

function NewAppointmentModal({
  clients,
  services,
  defaultDate,
  onClose,
}: {
  clients: ClientOption[];
  services: ServiceOption[];
  defaultDate?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Client state
  const [clientMode, setClientMode] = useState<Mode>("existing");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  // Pet state
  const [petMode, setPetMode] = useState<Mode>("existing");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState("DOG");
  const [newPetBreed, setNewPetBreed] = useState("");

  // Service / time
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const [date, setDate] = useState(defaultDate ?? todayStr);
  const [time, setTime] = useState("10:00");
  const [clientNotes, setClientNotes] = useState("");

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients.slice(0, 50);
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q.replace(/\D+/g, ""))
      )
      .slice(0, 50);
  }, [clients, clientSearch]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  // If selected client has no pets, force petMode to 'new'
  useEffect(() => {
    if (clientMode === "existing" && selectedClient && selectedClient.pets.length === 0) {
      setPetMode("new");
    }
  }, [clientMode, selectedClient]);
  // If switched to new client, force pet mode to new
  useEffect(() => {
    if (clientMode === "new") setPetMode("new");
  }, [clientMode]);

  const selectedService = services.find((s) => s.id === serviceId);

  function handleClose() {
    if (pending) return;
    setClosing(true);
    setTimeout(onClose, 200);
  }

  function submit() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      if (clientMode === "existing") {
        if (!selectedClientId) {
          setError("Selecciona un cliente.");
          return;
        }
        fd.set("clientId", selectedClientId);
      } else {
        if (!newClientName.trim()) {
          setError("Ingresa el nombre del cliente nuevo.");
          return;
        }
        if (newClientPhone.replace(/\D+/g, "").length < 7) {
          setError("Ingresa un teléfono válido para el cliente nuevo.");
          return;
        }
        fd.set("newClientName", newClientName.trim());
        fd.set("newClientPhone", newClientPhone);
      }

      if (petMode === "existing") {
        if (!selectedPetId) {
          setError("Selecciona la mascota.");
          return;
        }
        fd.set("petId", selectedPetId);
      } else {
        if (!newPetName.trim()) {
          setError("Ingresa el nombre de la mascota.");
          return;
        }
        fd.set("newPetName", newPetName.trim());
        fd.set("newPetSpecies", newPetSpecies);
        if (newPetBreed.trim()) fd.set("newPetBreed", newPetBreed.trim());
      }

      fd.set("serviceId", serviceId);
      fd.set("date", date);
      fd.set("time", time);
      if (clientNotes.trim()) fd.set("clientNotes", clientNotes.trim());

      const result = await createAppointmentByVetAction(null, fd);
      if (result.ok) {
        toast.success("Cita agendada", {
          description: "Aparecerá en tu agenda al instante.",
        });
        router.refresh();
        handleClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 ${
        closing ? "newappt-backdrop-out" : "newappt-backdrop-in"
      }`}
      style={{ background: "color-mix(in oklab, oklch(20% 0.04 240) 50%, transparent)" }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-[760px] max-h-[94vh] overflow-y-auto border ${
          closing ? "newappt-card-out" : "newappt-card-in"
        }`}
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 24,
          boxShadow: "0 24px 80px oklch(20% 0.04 240 / 0.45)",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b backdrop-blur"
          style={{
            background: "color-mix(in oklab, var(--vet-bg-card) 92%, transparent)",
            borderBottomColor: "var(--vet-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center"
              style={{ background: "var(--vet-green-glow)" }}
            >
              <VetIcon name="plus" size={18} color="var(--vet-green)" />
            </div>
            <div>
              <h2 className="text-[20px] font-black tracking-tight" style={{ color: "var(--vet-text-1)" }}>
                Nueva cita
              </h2>
              <p className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                Agendar manualmente — útil para clientes que llaman por teléfono
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={handleClose}
            disabled={pending}
            className="w-10 h-10 flex items-center justify-center rounded-[12px] border disabled:opacity-50"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
          >
            <VetIcon name="close" size={18} color="var(--vet-text-2)" />
          </button>
        </div>

        <div className="p-5 sm:p-7 flex flex-col gap-6">
          {/* Cliente */}
          <Section
            title="Cliente"
            mode={clientMode}
            onModeChange={setClientMode}
            options={[
              { value: "existing", label: "Existente" },
              { value: "new", label: "Nuevo" },
            ]}
          >
            {clientMode === "existing" ? (
              <div className="flex flex-col gap-2.5">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar por nombre o teléfono..."
                  className={fieldClass}
                  style={fieldStyle}
                />
                <div
                  className="border rounded-[12px] max-h-[180px] overflow-y-auto"
                  style={{ borderColor: "var(--vet-border)" }}
                >
                  {filteredClients.length === 0 ? (
                    <div
                      className="px-4 py-6 text-center text-[12px] font-semibold"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Sin coincidencias. Cambia a &quot;Nuevo&quot; para crearlo.
                    </div>
                  ) : (
                    filteredClients.map((c) => {
                      const active = c.id === selectedClientId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setSelectedPetId("");
                            if (c.pets.length > 0) setPetMode("existing");
                            else setPetMode("new");
                          }}
                          className="w-full flex items-center justify-between text-left px-4 py-2.5 transition-colors"
                          style={{
                            background: active ? "var(--vet-green-glow)" : "transparent",
                            borderBottom: "1px solid var(--vet-border)",
                          }}
                        >
                          <div>
                            <div
                              className="text-[13px] font-extrabold"
                              style={{
                                color: active ? "var(--vet-green)" : "var(--vet-text-1)",
                              }}
                            >
                              {c.name}
                            </div>
                            <div
                              className="vet-mono text-[11px] font-bold"
                              style={{ color: "var(--vet-text-3)" }}
                            >
                              {c.phone} · {c.pets.length} {c.pets.length === 1 ? "mascota" : "mascotas"}
                            </div>
                          </div>
                          {active && (
                            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M2 7l3 3 7-7"
                                stroke="var(--vet-green)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <Field label="Nombre del cliente">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Ej. María Pérez"
                    className={fieldClass}
                    style={fieldStyle}
                  />
                </Field>
                <Field label="Teléfono">
                  <input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="10 dígitos"
                    inputMode="numeric"
                    className={fieldClass}
                    style={fieldStyle}
                  />
                </Field>
              </div>
            )}
          </Section>

          {/* Mascota */}
          <Section
            title="Mascota"
            mode={petMode}
            onModeChange={setPetMode}
            options={[
              { value: "existing", label: "Existente" },
              { value: "new", label: "Nueva" },
            ]}
            disableExisting={
              clientMode === "new" ||
              (clientMode === "existing" && (!selectedClient || selectedClient.pets.length === 0))
            }
            help={
              clientMode === "existing" && selectedClient && selectedClient.pets.length === 0
                ? "Este cliente aún no tiene mascotas."
                : clientMode === "new"
                  ? "Solo puedes crear una mascota nueva para un cliente nuevo."
                  : !selectedClient && clientMode === "existing"
                    ? "Selecciona primero el cliente."
                    : undefined
            }
          >
            {petMode === "existing" ? (
              <div
                className="border rounded-[12px] max-h-[180px] overflow-y-auto"
                style={{ borderColor: "var(--vet-border)" }}
              >
                {!selectedClient ? (
                  <div
                    className="px-4 py-6 text-center text-[12px] font-semibold"
                    style={{ color: "var(--vet-text-3)" }}
                  >
                    Selecciona un cliente arriba.
                  </div>
                ) : selectedClient.pets.length === 0 ? (
                  <div
                    className="px-4 py-6 text-center text-[12px] font-semibold"
                    style={{ color: "var(--vet-text-3)" }}
                  >
                    Sin mascotas registradas para este cliente.
                  </div>
                ) : (
                  selectedClient.pets.map((p) => {
                    const active = p.id === selectedPetId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPetId(p.id)}
                        className="w-full flex items-center justify-between text-left px-4 py-2.5 transition-colors"
                        style={{
                          background: active ? "var(--vet-green-glow)" : "transparent",
                          borderBottom: "1px solid var(--vet-border)",
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-[18px]">
                            {SPECIES_EMOJI[p.species] ?? "🐾"}
                          </span>
                          <div>
                            <div
                              className="text-[13px] font-extrabold"
                              style={{
                                color: active ? "var(--vet-green)" : "var(--vet-text-1)",
                              }}
                            >
                              {p.name}
                            </div>
                            <div
                              className="text-[11px] font-bold"
                              style={{ color: "var(--vet-text-3)" }}
                            >
                              {SPECIES.find((s) => s.value === p.species)?.label ?? p.species}
                            </div>
                          </div>
                        </div>
                        {active && (
                          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                            <path
                              d="M2 7l3 3 7-7"
                              stroke="var(--vet-green)"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <Field label="Nombre">
                  <input
                    type="text"
                    value={newPetName}
                    onChange={(e) => setNewPetName(e.target.value)}
                    placeholder="Ej. Firulais"
                    className={fieldClass}
                    style={fieldStyle}
                  />
                </Field>
                <Field label="Especie">
                  <select
                    value={newPetSpecies}
                    onChange={(e) => setNewPetSpecies(e.target.value)}
                    className={fieldClass}
                    style={{ ...fieldStyle, appearance: "none" }}
                  >
                    {SPECIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Raza (opcional)">
                  <input
                    type="text"
                    value={newPetBreed}
                    onChange={(e) => setNewPetBreed(e.target.value)}
                    placeholder="Ej. Labrador"
                    className={fieldClass}
                    style={fieldStyle}
                  />
                </Field>
              </div>
            )}
          </Section>

          {/* Servicio */}
          <Section title="Servicio">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <Field label="Tipo de servicio">
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className={fieldClass}
                  style={{ ...fieldStyle, appearance: "none" }}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              {selectedService && (
                <div
                  className="px-4 py-3 rounded-[12px] flex flex-col justify-center"
                  style={{ background: "var(--vet-bg-mid)" }}
                >
                  <div
                    className="text-[10px] font-extrabold uppercase tracking-wider"
                    style={{ color: "var(--vet-text-3)" }}
                  >
                    Estimado
                  </div>
                  <div
                    className="vet-mono text-[18px] font-extrabold"
                    style={{ color: "var(--vet-text-1)" }}
                  >
                    ${selectedService.basePrice} · {selectedService.durationMinutes} min
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Fecha y hora */}
          <Section title="Fecha y hora">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <Field label="Fecha">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </Field>
              <Field label="Hora">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </Field>
            </div>
          </Section>

          {/* Notas */}
          <Section title="Notas (opcional)">
            <textarea
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              rows={3}
              placeholder="Lo que el cliente mencionó por teléfono..."
              className="w-full px-4 py-3 rounded-[12px] border outline-none text-[14px] font-semibold focus:border-[var(--vet-green)] transition-colors resize-y"
              style={fieldStyle}
            />
          </Section>

          {error && (
            <div
              className="px-4 py-3 rounded-[12px] border text-[13px] font-bold flex items-center gap-2"
              style={{
                background: "color-mix(in oklab, var(--vet-red) 10%, transparent)",
                borderColor: "color-mix(in oklab, var(--vet-red) 28%, transparent)",
                color: "var(--vet-red)",
              }}
            >
              <VetIcon name="warning" size={14} color="var(--vet-red)" />
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={pending}
              className="h-12 px-6 rounded-[14px] text-[14px] font-extrabold border disabled:opacity-50"
              style={{
                background: "var(--vet-bg-mid)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-1)",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-12 px-6 rounded-[14px] text-[14px] font-extrabold text-white transition-all disabled:opacity-60 hover:brightness-105 active:scale-[.99]"
              style={{
                background:
                  "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
                boxShadow: "0 8px 24px var(--vet-green-glow)",
              }}
            >
              {pending ? "Agendando..." : "Confirmar cita"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes newappt-backdrop-in-kf { from { opacity: 0; } to { opacity: 1; } }
        @keyframes newappt-backdrop-out-kf { from { opacity: 1; } to { opacity: 0; } }
        @keyframes newappt-card-in-kf {
          from { opacity: 0; transform: translateY(20px) scale(.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes newappt-card-out-kf {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(10px) scale(.97); }
        }
        .newappt-backdrop-in { animation: newappt-backdrop-in-kf .18s ease both; }
        .newappt-backdrop-out { animation: newappt-backdrop-out-kf .18s ease both; }
        .newappt-card-in { animation: newappt-card-in-kf .25s cubic-bezier(.22,1,.36,1) both; }
        .newappt-card-out { animation: newappt-card-out-kf .18s ease both; }
        @media (prefers-reduced-motion: reduce) {
          .newappt-card-in, .newappt-card-out,
          .newappt-backdrop-in, .newappt-backdrop-out { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────── */

const SPECIES_EMOJI: Record<string, string> = {
  DOG: "🐶",
  CAT: "🐱",
  BIRD: "🐦",
  RABBIT: "🐰",
  HAMSTER: "🐹",
  REPTILE: "🦎",
  OTHER: "🐾",
};

const fieldClass =
  "w-full h-11 px-4 rounded-[12px] border outline-none text-[14px] font-semibold focus:border-[var(--vet-green)] transition-colors";
const fieldStyle = {
  background: "var(--vet-bg-card)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
} as const;

function Section({
  title,
  children,
  mode,
  onModeChange,
  options,
  disableExisting,
  help,
}: {
  title: string;
  children: React.ReactNode;
  mode?: Mode;
  onModeChange?: (m: Mode) => void;
  options?: { value: Mode; label: string }[];
  disableExisting?: boolean;
  help?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3
          className="text-[12px] font-extrabold uppercase tracking-wider"
          style={{ color: "var(--vet-text-3)" }}
        >
          {title}
        </h3>
        {options && mode && onModeChange && (
          <div
            className="inline-flex p-1 rounded-[12px] border"
            style={{ background: "var(--vet-bg-mid)", borderColor: "var(--vet-border)" }}
          >
            {options.map((o) => {
              const active = o.value === mode;
              const disabled = o.value === "existing" && disableExisting;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => !disabled && onModeChange(o.value)}
                  disabled={disabled}
                  className="px-3 h-7 rounded-[8px] text-[12px] font-extrabold transition-colors disabled:opacity-40"
                  style={{
                    background: active ? "var(--vet-bg-card)" : "transparent",
                    color: active ? "var(--vet-text-1)" : "var(--vet-text-3)",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {help && (
        <div className="text-[11px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
          {help}
        </div>
      )}
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-[11px] font-extrabold uppercase tracking-wider mb-1.5"
        style={{ color: "var(--vet-text-3)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
