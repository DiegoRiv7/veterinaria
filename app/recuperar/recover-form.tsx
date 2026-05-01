"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { VetIcon } from "@/components/vet/VetIcon";

export function RecoverForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, {});

  if (state.ok) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "var(--vet-green-glow)" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--vet-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-[18px] font-extrabold" style={{ color: "var(--vet-text-1)" }}>
          Solicitud recibida
        </h2>
        <p
          className="text-[13px] font-semibold leading-relaxed"
          style={{ color: "var(--vet-text-2)" }}
        >
          Si la cuenta existe, la clínica se comunicará contigo al teléfono que tienes registrado para ayudarte a restablecer tu contraseña.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="email"
          className="block text-[12px] font-extrabold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          Correo de tu cuenta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
          className="w-full h-12 px-4 rounded-[12px] border outline-none text-[15px] font-semibold focus:border-[var(--vet-green)] transition-colors"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-1)",
          }}
        />
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
        {pending ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
