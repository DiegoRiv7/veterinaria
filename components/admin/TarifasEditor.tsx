"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateSpeciesModifierAction } from "@/app/actions/admin";
import { toast } from "sonner";

type Row = {
  species: string;
  label: string;
  emoji: string;
  multiplier: number;
};

export function TarifasEditor({ rows }: { rows: Row[] }) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <RowCard key={r.species} row={r} />
      ))}
    </div>
  );
}

function RowCard({ row }: { row: Row }) {
  const [value, setValue] = useState(row.multiplier);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function save() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("species", row.species);
        fd.set("multiplier", String(value));
        await updateSpeciesModifierAction(fd);
        setSavedAt(Date.now());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  const pctLabel =
    value === 1
      ? "precio base"
      : value > 1
      ? `+${Math.round((value - 1) * 100)}%`
      : `${Math.round((value - 1) * 100)}%`;

  return (
    <div
      className="border p-5 rounded-[18px] flex flex-col gap-3"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: "var(--vet-green-glow)" }}
        >
          {row.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[15px] font-extrabold"
            style={{ color: "var(--vet-text-1)" }}
          >
            {row.label}
          </p>
          <p
            className="text-[11px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            {pctLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0.1}
          step={0.05}
          value={value}
          onChange={(e) => setValue(Number(e.target.value) || 1)}
          className="flex-1 h-10 px-3 rounded-[10px] border outline-none text-[14px] font-extrabold text-center vet-mono"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-1)",
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 h-10 rounded-[10px] text-[12px] font-extrabold text-white transition-all disabled:opacity-60"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
            boxShadow: "0 4px 12px var(--vet-green-glow)",
          }}
        >
          {pending ? (
            "…"
          ) : savedAt && Date.now() - savedAt < 2500 ? (
            <>
              <Check size={14} /> OK
            </>
          ) : (
            "Guardar"
          )}
        </button>
      </div>
    </div>
  );
}
