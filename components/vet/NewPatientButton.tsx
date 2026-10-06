"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FancySelect, VET_TOKENS } from "@/components/FancySelect";
import {
  createPatientByVetAction,
  completePatientFichaAction,
} from "@/app/actions/patients";
import type { ClientOption } from "./NewAppointmentButton";

/**
 * Alta de paciente desde la lista de pacientes, sin agendar cita:
 * mascota nueva para un cliente existente, o cliente nuevo + mascota.
 */

const SEX_OPTIONS = [
  { value: "UNKNOWN", label: "Sin especificar" },
  { value: "MALE", label: "Macho" },
  { value: "FEMALE", label: "Hembra" },
];
const BOOL_OPTIONS = [
  { value: "false", label: "No" },
  { value: "true", label: "Sí" },
];

const SPECIES: { value: string; label: string }[] = [
  { value: "DOG", label: "Perro" },
  { value: "CAT", label: "Gato" },
  { value: "BIRD", label: "Ave" },
  { value: "RABBIT", label: "Conejo" },
  { value: "HAMSTER", label: "Hámster" },
  { value: "REPTILE", label: "Reptil" },
  { value: "OTHER", label: "Otro" },
];

const fieldClass =
  "w-full h-11 px-4 rounded-[12px] border outline-none text-[14px] font-semibold focus:border-[var(--vet-green)] transition-colors";
const fieldStyle = {
  background: "var(--vet-bg-card)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
} as const;

export function NewPatientButton({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Cliente
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  // Mascota (siempre nueva)
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("DOG");
  const [petBreed, setPetBreed] = useState("");

  // Paso 2: llenar la ficha del paciente recién creado
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const [fichaBirth, setFichaBirth] = useState("");
  const [fichaSex, setFichaSex] = useState("UNKNOWN");
  const [fichaWeight, setFichaWeight] = useState("");
  const [fichaColor, setFichaColor] = useState("");
  const [fichaSterilized, setFichaSterilized] = useState("false");
  const [fichaChip, setFichaChip] = useState("");

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients.slice(0, 50);
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [clients, clientSearch]);

  function openDialog() {
    setClientMode("existing");
    setClientSearch("");
    setSelectedClientId("");
    setNewClientName("");
    setNewClientPhone("");
    setPetName("");
    setPetSpecies("DOG");
    setPetBreed("");
    setCreated(null);
    setFichaBirth("");
    setFichaSex("UNKNOWN");
    setFichaWeight("");
    setFichaColor("");
    setFichaSterilized("false");
    setFichaChip("");
    setOpen(true);
  }

  function finish(petId: string) {
    setOpen(false);
    router.push(`/vet/pacientes/${petId}`);
    router.refresh();
  }

  function saveFicha() {
    if (!created) return;
    startTransition(async () => {
      const res = await completePatientFichaAction({
        petId: created.id,
        birthDate: fichaBirth,
        sex: fichaSex,
        weightKg: fichaWeight,
        color: fichaColor,
        sterilized: fichaSterilized,
        microchipId: fichaChip,
      });
      if (res.ok) {
        toast.success(`Ficha de ${created.name} guardada.`);
        finish(created.id);
      } else {
        toast.error(res.error);
      }
    });
  }

  function submit() {
    if (clientMode === "existing" && !selectedClientId) {
      toast.error("Selecciona el cliente.");
      return;
    }
    if (clientMode === "new" && !newClientName.trim()) {
      toast.error("Ingresa el nombre del cliente.");
      return;
    }
    if (!petName.trim()) {
      toast.error("Ingresa el nombre de la mascota.");
      return;
    }
    const fd = new FormData();
    if (clientMode === "existing") fd.set("clientId", selectedClientId);
    else {
      fd.set("newClientName", newClientName);
      fd.set("newClientPhone", newClientPhone);
    }
    fd.set("petName", petName);
    fd.set("petSpecies", petSpecies);
    fd.set("petBreed", petBreed);

    startTransition(async () => {
      const res = await createPatientByVetAction(null, fd);
      if (res.ok) {
        toast.success(`${res.petName} quedó registrado como paciente.`);
        // Paso 2: llenar la ficha de una vez, sin salir del diálogo.
        setCreated({ id: res.petId, name: res.petName });
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12px] font-extrabold text-white transition hover:brightness-105 shrink-0"
        style={{
          background:
            "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
          boxShadow: "0 4px 12px var(--vet-green-glow)",
        }}
      >
        ＋ Nuevo paciente
      </button>

      {open && (
        <div
          className="vet-portal fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
          style={{ background: "rgba(30, 18, 10, 0.45)", backdropFilter: "blur(3px)" }}
          onClick={() => {
            if (pending) return;
            if (created) finish(created.id);
            else setOpen(false);
          }}
        >
          <div
            className="w-full max-w-[620px] max-h-[92dvh] overflow-y-auto rounded-[22px] border flex flex-col"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.30)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b sticky top-0 z-10"
              style={{
                background: "var(--vet-bg-mid)",
                borderBottomColor: "var(--vet-border)",
              }}
            >
              <div>
                <h3 className="text-[17px] font-black" style={{ color: "var(--vet-text-1)" }}>
                  {created ? `Ficha de ${created.name}` : "Nuevo paciente"}
                </h3>
                <p className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                  {created
                    ? "Completa los datos de la ficha de una vez (todo es opcional)"
                    : "Mascota nueva para un cliente existente, o cliente y mascota nuevos"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => (created ? finish(created.id) : setOpen(false))}
                className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition hover:brightness-95 shrink-0"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-2)",
                }}
              >
                ✕
              </button>
            </div>

            {created ? (
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Fecha de nacimiento
                    </label>
                    <input
                      type="date"
                      value={fichaBirth}
                      onChange={(e) => setFichaBirth(e.target.value)}
                      className={fieldClass}
                      style={fieldStyle}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Género
                    </label>
                    <FancySelect
                      value={fichaSex}
                      onChange={setFichaSex}
                      required
                      options={SEX_OPTIONS}
                      height={44}
                      accent="var(--vet-green)"
                      tokens={VET_TOKENS}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={fichaWeight}
                      onChange={(e) => setFichaWeight(e.target.value)}
                      placeholder="Ej. 8.5"
                      className={fieldClass}
                      style={fieldStyle}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Color
                    </label>
                    <input
                      type="text"
                      value={fichaColor}
                      onChange={(e) => setFichaColor(e.target.value)}
                      placeholder="Ej. Café con blanco"
                      className={fieldClass}
                      style={fieldStyle}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Esterilizado/a
                    </label>
                    <FancySelect
                      value={fichaSterilized}
                      onChange={setFichaSterilized}
                      required
                      options={BOOL_OPTIONS}
                      height={44}
                      accent="var(--vet-green)"
                      tokens={VET_TOKENS}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Microchip
                    </label>
                    <input
                      type="text"
                      value={fichaChip}
                      onChange={(e) => setFichaChip(e.target.value)}
                      placeholder="Número de microchip"
                      className={fieldClass}
                      style={fieldStyle}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => finish(created.id)}
                    disabled={pending}
                    className="h-11 px-4 rounded-[12px] text-[13px] font-extrabold border transition hover:brightness-105 disabled:opacity-60"
                    style={{
                      background: "var(--vet-bg-card)",
                      borderColor: "var(--vet-border)",
                      color: "var(--vet-text-2)",
                    }}
                  >
                    Omitir por ahora
                  </button>
                  <button
                    type="button"
                    onClick={saveFicha}
                    disabled={pending}
                    className="h-11 px-5 rounded-[12px] text-[13px] font-extrabold text-white transition hover:brightness-105 disabled:opacity-60"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
                      boxShadow: "0 6px 18px var(--vet-green-glow)",
                    }}
                  >
                    {pending ? "Guardando…" : "Guardar ficha"}
                  </button>
                </div>
              </div>
            ) : (
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              {/* Cliente */}
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="text-[11px] font-extrabold uppercase tracking-wider"
                    style={{ color: "var(--vet-text-3)" }}
                  >
                    Cliente
                  </span>
                  <div
                    className="inline-flex rounded-[11px] border p-0.5"
                    style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
                  >
                    {(
                      [
                        { value: "existing", label: "Existente" },
                        { value: "new", label: "Nuevo" },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setClientMode(m.value)}
                        className="px-3.5 h-8 rounded-[9px] text-[12px] font-extrabold transition-colors"
                        style={{
                          background: clientMode === m.value ? "var(--vet-bg-mid)" : "transparent",
                          color:
                            clientMode === m.value ? "var(--vet-text-1)" : "var(--vet-text-3)",
                          boxShadow:
                            clientMode === m.value ? "0 2px 6px rgba(0,0,0,0.08)" : undefined,
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

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
                      className="border rounded-[12px] max-h-[200px] overflow-y-auto"
                      style={{ borderColor: "var(--vet-border)", background: "var(--vet-bg-card)" }}
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
                              onClick={() => setSelectedClientId(c.id)}
                              className="w-full px-4 py-3 text-left border-b last:border-b-0 transition-colors"
                              style={{
                                borderBottomColor:
                                  "color-mix(in oklab, var(--vet-border) 65%, transparent)",
                                background: active
                                  ? "color-mix(in oklab, var(--vet-green) 10%, transparent)"
                                  : "transparent",
                              }}
                            >
                              <div
                                className="text-[14px] font-extrabold"
                                style={{
                                  color: active ? "var(--vet-green-dim)" : "var(--vet-text-1)",
                                }}
                              >
                                {active ? "✓ " : ""}
                                {c.name}
                              </div>
                              <div
                                className="text-[12px] font-semibold"
                                style={{ color: "var(--vet-text-3)" }}
                              >
                                {c.phone} · {c.pets.length}{" "}
                                {c.pets.length === 1 ? "mascota" : "mascotas"}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-[11px] font-extrabold uppercase tracking-wider"
                        style={{ color: "var(--vet-text-3)" }}
                      >
                        Nombre del cliente
                      </label>
                      <input
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Ej. María Pérez"
                        className={fieldClass}
                        style={fieldStyle}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-[11px] font-extrabold uppercase tracking-wider"
                        style={{ color: "var(--vet-text-3)" }}
                      >
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        placeholder="10 dígitos"
                        className={fieldClass}
                        style={fieldStyle}
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* Mascota */}
              <section className="flex flex-col gap-2.5">
                <span
                  className="text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  Mascota nueva
                </span>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="Ej. Firulais"
                      className={fieldClass}
                      style={fieldStyle}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Especie
                    </label>
                    <FancySelect
                      value={petSpecies}
                      onChange={setPetSpecies}
                      required
                      options={SPECIES}
                      height={44}
                      accent="var(--vet-green)"
                      tokens={VET_TOKENS}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Raza (opcional)
                    </label>
                    <input
                      type="text"
                      value={petBreed}
                      onChange={(e) => setPetBreed(e.target.value)}
                      placeholder="Ej. Labrador"
                      className={fieldClass}
                      style={fieldStyle}
                    />
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="h-11 px-4 rounded-[12px] text-[13px] font-extrabold border transition hover:brightness-105 disabled:opacity-60"
                  style={{
                    background: "var(--vet-bg-card)",
                    borderColor: "var(--vet-border)",
                    color: "var(--vet-text-2)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="h-11 px-5 rounded-[12px] text-[13px] font-extrabold text-white transition hover:brightness-105 disabled:opacity-60"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
                    boxShadow: "0 6px 18px var(--vet-green-glow)",
                  }}
                >
                  {pending ? "Guardando…" : "Crear paciente"}
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
