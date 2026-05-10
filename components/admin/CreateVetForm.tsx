"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { addVetAction } from "@/app/actions/admin";

const inputClass =
  "w-full h-11 px-3 rounded-[10px] border outline-none text-[14px] font-bold transition-colors focus:[border-color:var(--vet-green)]";
const inputStyle = {
  background: "var(--vet-bg-card)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
} as const;
const labelClass =
  "block text-[10px] font-extrabold uppercase tracking-wider mb-1.5";
const labelStyle = { color: "var(--vet-text-3)" } as const;

export function CreateVetForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("name", name);
        fd.set("email", email);
        fd.set("phone", phone);
        fd.set("password", password);
        fd.set("bio", bio);
        await addVetAction(fd);
        toast.success(`Veterinario “${name}” creado`);
        setName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setBio("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al crear");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="border p-5 rounded-[18px] flex flex-col gap-3"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>
            Nombre completo
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dra. Ana Pérez"
            required
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Correo (login)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana@vetsfriend.com"
            required
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Teléfono
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10 dígitos"
            required
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Contraseña temporal
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 4 caracteres"
            required
            minLength={4}
            className={inputClass + " vet-mono"}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label className={labelClass} style={labelStyle}>
          Bio / especialidad (opcional)
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={2}
          placeholder="Cirujano de pequeñas especies, 8 años de experiencia"
          className={inputClass + " resize-none h-auto py-2.5"}
          style={inputStyle}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-stretch sm:self-end inline-flex items-center justify-center gap-1.5 px-5 h-11 rounded-[12px] text-[13px] font-extrabold text-white transition-all disabled:opacity-60"
        style={{
          background:
            "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
          boxShadow: "0 4px 12px var(--vet-green-glow)",
        }}
      >
        {pending ? (
          "Creando…"
        ) : (
          <>
            <Check size={14} /> Crear veterinario
          </>
        )}
      </button>
    </form>
  );
}
