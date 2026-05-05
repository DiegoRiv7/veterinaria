"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { VetIcon } from "@/components/vet/VetIcon";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { error: undefined });
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="email"
          className="block text-[12px] font-extrabold uppercase tracking-wider mb-2"
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
          className="w-full h-13 px-4 rounded-[14px] border outline-none text-[15px] font-semibold focus:border-[var(--vet-green)] transition-colors"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-1)",
            height: 52,
          }}
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label
            htmlFor="password"
            className="block text-[12px] font-extrabold uppercase tracking-wider"
            style={{ color: "var(--vet-text-3)" }}
          >
            Contraseña
          </label>
          <Link
            href="/recuperar"
            className="text-[12px] font-bold no-underline"
            style={{ color: "var(--vet-green)" }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full px-4 rounded-[14px] border outline-none text-[15px] font-semibold focus:border-[var(--vet-green)] transition-colors"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-1)",
            height: 52,
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
        className="w-full mt-3 rounded-[14px] text-[16px] font-extrabold text-white transition-all disabled:opacity-60 hover:brightness-105 active:scale-[.99]"
        style={{
          background:
            "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
          boxShadow: "0 8px 24px var(--vet-green-glow)",
          height: 56,
        }}
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
