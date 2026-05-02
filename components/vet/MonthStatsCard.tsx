import { VetIcon } from "./VetIcon";

type Props = {
  monthLabel: string;
  total: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  topService: { name: string; count: number } | null;
  topPet: { name: string; count: number } | null;
};

export function MonthStatsCard({
  monthLabel,
  total,
  completed,
  scheduled,
  cancelled,
  topService,
  topPet,
}: Props) {
  const max = Math.max(1, completed, scheduled, cancelled);

  return (
    <div
      className="border p-5 sm:p-6 flex flex-col gap-4"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        borderRadius: 22,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{ background: "var(--vet-green-glow)" }}
        >
          <VetIcon name="dashboard" size={16} color="var(--vet-green)" />
        </div>
        <div>
          <div className="font-extrabold text-[15px]" style={{ color: "var(--vet-text-1)" }}>
            Resumen de {monthLabel}
          </div>
          <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
            {total} {total === 1 ? "cita" : "citas"} en total
          </div>
        </div>
      </div>

      {/* Mini bars per status */}
      <div className="flex flex-col gap-2.5">
        {[
          { label: "Atendidas", val: completed, color: "var(--vet-blue)" },
          { label: "Pendientes", val: scheduled, color: "var(--vet-green)" },
          { label: "Canceladas", val: cancelled, color: "var(--vet-red)" },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] font-bold" style={{ color: "var(--vet-text-2)" }}>
                {row.label}
              </span>
              <span
                className="vet-mono text-[12px] font-extrabold"
                style={{ color: "var(--vet-text-1)" }}
              >
                {row.val}
              </span>
            </div>
            <div className="h-[6px] rounded-full" style={{ background: "var(--vet-bg-hover)" }}>
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${(row.val / max) * 100}%`, background: row.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Top service / top pet */}
      <div
        className="grid grid-cols-2 gap-2 pt-3 border-t"
        style={{ borderTopColor: "var(--vet-border)" }}
      >
        <TopTile
          label="Servicio top"
          name={topService?.name ?? "—"}
          count={topService?.count}
          color="var(--vet-violet)"
        />
        <TopTile
          label="Paciente top"
          name={topPet?.name ?? "—"}
          count={topPet?.count}
          color="var(--vet-amber)"
        />
      </div>
    </div>
  );
}

function TopTile({
  label,
  name,
  count,
  color,
}: {
  label: string;
  name: string;
  count?: number;
  color: string;
}) {
  return (
    <div
      className="rounded-[12px] p-3"
      style={{ background: "var(--vet-bg-mid)" }}
    >
      <div
        className="text-[10px] font-extrabold uppercase tracking-wider mb-1"
        style={{ color: "var(--vet-text-3)" }}
      >
        {label}
      </div>
      <div
        className="text-[14px] font-extrabold truncate"
        style={{ color: "var(--vet-text-1)" }}
      >
        {name}
      </div>
      {count !== undefined && count > 0 && (
        <div className="vet-mono text-[11px] font-bold mt-0.5" style={{ color }}>
          {count} {count === 1 ? "cita" : "citas"}
        </div>
      )}
    </div>
  );
}
