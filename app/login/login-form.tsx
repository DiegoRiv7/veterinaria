"use client";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { VetIcon } from "@/components/vet/VetIcon";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { error: undefined });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="email"
          className="block text-[12px] font-extrabold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          Correo electrónico
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
      <div>
        <label
          htmlFor="password"
          className="block text-[12px] font-extrabold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
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
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
