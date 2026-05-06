"use client";

import * as React from "react";
import { FileText } from "lucide-react";

export function DownloadRecetaButton({
  id,
  label = "Descargar consulta médica",
}: {
  id: string;
  label?: string;
}) {
  const href = `/api/receta/${id}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full rounded-[16px] px-5 py-4 text-white font-extrabold text-[15px] hover:brightness-105 active:scale-[.99] transition flex items-center gap-3"
      style={{
        background:
          "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 60%, oklch(45% 0.12 38)))",
        boxShadow:
          "0 12px 28px color-mix(in oklab, var(--color-brand) 32%, transparent)",
      }}
    >
      <span
        className="rounded-[12px] flex items-center justify-center shrink-0"
        style={{
          width: 38,
          height: 38,
          background: "rgba(255,255,255,0.22)",
        }}
      >
        <FileText className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex-1 text-left leading-tight">
        {label}
        <span
          className="block text-[12px] font-semibold mt-0.5"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          Diagnóstico, indicaciones y medicamentos en PDF
        </span>
      </span>
      <span className="text-white/80">→</span>
    </a>
  );
}

export default DownloadRecetaButton;
